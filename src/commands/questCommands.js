import { SlashCommandBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } from 'discord.js';
import { runQuestOne, runQuestAll, runQuestList } from '../quest/questRunners.js';
import { buildAccountPanel, buildPremiumLinkCard, buildLinkModal } from '../Ui/linkUI.js';
import { disableAutoquest, enableAutoquest, isAutoquestEnabled } from '../quest/autoquestStore.js';
import { PREFIX } from '../utils/config.js';
import { sanitizeToken, isValidUserToken } from '../utils/tokenHelper.js';
import { getAllowedSlots } from '../quest/slotAccess.js';

export function makeTokenStore() {
    const store = new Map();
    return {
        getActiveToken: (userId) => store.get(`${userId}_active`),
        getAll: (userId) => {
            const res = [];
            for (let i = 0; i < 5; i++) {
                const token = store.get(`${userId}_${i}`);
                if (token) res.push({ username: 'LinkedUser', token });
            }
            return res;
        },
        save: (userId, slot, token) => {
            store.set(`${userId}_${slot}`, token);
            store.set(`${userId}_active`, token);
        }
    };
}

export const questCmd = {
    data: new SlashCommandBuilder().setName('quest').setDescription('Pick and complete one Discord quest'),
    prefix: 'quest',
    async execute(interaction, client) {
        await interaction.deferReply();
        await runQuestOne(interaction.user.id, client.tokenStore, (opts) => interaction.followUp(opts));
    },
    async prefixExecute(message, _args, client) {
        await runQuestOne(message.author.id, client.tokenStore, (opts) => message.channel.send(opts));
    },
};

export const questAllCmd = {
    data: new SlashCommandBuilder().setName('questall').setDescription('Complete all quests at once'),
    prefix: 'questall',
    async execute(interaction, client) {
        await interaction.deferReply();
        await runQuestAll(interaction.user.id, client.tokenStore, (opts) => interaction.followUp(opts));
    },
    async prefixExecute(message, _args, client) {
        await runQuestAll(message.author.id, client.tokenStore, (opts) => message.channel.send(opts));
    },
};

export const questListCmd = {
    data: new SlashCommandBuilder().setName('questlist').setDescription('List all Discord quests and their status'),
    prefix: 'questlist',
    async execute(interaction, client) {
        await interaction.deferReply();
        await runQuestList(interaction.user.id, client.tokenStore, (opts) => interaction.followUp(opts));
    },
    async prefixExecute(message, _args, client) {
        await runQuestList(message.author.id, client.tokenStore, (opts) => message.channel.send(opts));
    },
};

export const linkCmd = {
    data: new SlashCommandBuilder().setName('link').setDescription('Open the 5-slot account panel'),
    prefix: 'link',
    async execute(interaction, client) {
        const allowed = getAllowedSlots(interaction.member, client.slotConfig);
        if (allowed.count === 0) {
            const c = new ContainerBuilder().setAccentColor(0xED4245);
            c.addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🔒 No Access\n`;guide` likho'));
            return interaction.reply({ components: [c], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
        }
        const slotsData = client.tokenStore.getAll(interaction.user.id);
        const premium = buildPremiumLinkCard();
        const panel = buildAccountPanel(slotsData, interaction.member, client.slotConfig, allowed.count);
        await interaction.reply({ components: [...premium.components, ...panel.components], flags: MessageFlags.IsComponentsV2 });
    },
    async prefixExecute(message, _args, client) {
        const allowed = getAllowedSlots(message.member, client.slotConfig);
        if (allowed.count === 0) {
            const c = new ContainerBuilder().setAccentColor(0xED4245);
            c.addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🔒 No Access\n`;guide` likho'));
            return message.reply({ components: [c], flags: MessageFlags.IsComponentsV2 });
        }
        const slotsData = client.tokenStore.getAll(message.author.id);
        const premium = buildPremiumLinkCard();
        const panel = buildAccountPanel(slotsData, message.member, client.slotConfig, allowed.count);
        await message.reply({ components: [...premium.components, ...panel.components], flags: MessageFlags.IsComponentsV2 });
    },
};

export async function handleLinkModal(interaction, client) {
    const raw = interaction.fields.getTextInputValue('token_input') || interaction.fields.getTextInputValue('link_token_input');
    const token = sanitizeToken(raw);
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    if (!isValidUserToken(token)) {
        return interaction.editReply('❌ Invalid Token Format!');
    }
    try {
        const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: token } });
        if (!res.ok) throw new Error('Invalid token');
        const userData = await res.json();
        client.tokenStore.save(interaction.user.id, 0, token);
        await interaction.editReply(`✅ Slot #1 Linked! (${userData.username})`);
    } catch (e) {
        await interaction.editReply('❌ Token Rejected by Discord!');
    }
}

export async function handleLinkPromptButton(interaction, client) {
    const modal = buildLinkModal(0);
    await interaction.showModal(modal);
}
