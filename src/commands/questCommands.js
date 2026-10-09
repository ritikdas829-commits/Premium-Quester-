import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { runQuestOne, runQuestAll, runQuestList } from '../quest/questRunners.js';
import { buildAccountPanelCard, buildLinkModal } from '../ui/linkUI.js';
import { disableAutoquest, enableAutoquest, isAutoquestEnabled } from '../quest/autoquestStore.js';
import { PREFIX } from '../utils/config.js';
import { sanitizeToken, isValidUserToken } from '../utils/tokenHelper.js';

export const questCmd = {
    data: new SlashCommandBuilder().setName('quest').setDescription('Pick and complete one Discord quest'),
    prefix: 'quest',
    async execute(interaction, client) {
        const ts = client.tokenStore;
        await interaction.deferReply();
        await runQuestOne(interaction.user.id, ts, (opts) => interaction.followUp(opts));
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
        const slotsData = client.tokenStore.getSlots(interaction.user.id);
        const panel = buildAccountPanelCard(slotsData);
        await interaction.reply(panel);
    },
    async prefixExecute(message, _args, client) {
        const slotsData = client.tokenStore.getSlots(message.author.id);
        const panel = buildAccountPanelCard(slotsData);
        await message.reply(panel);
    },
};

export async function handleLinkModal(interaction, client) {
    const raw = interaction.fields.getTextInputValue('token_input');
    const token = sanitizeToken(raw);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    if (!isValidUserToken(token)) {
        return interaction.editReply('❌ **Invalid Token Format!** Sahi token dalo.');
    }

    try {
        const res = await fetch('https://discord.com/api/v10/users/@me', { headers: { Authorization: token } });
        if (!res.ok) throw new Error('Invalid token');
        const userData = await res.json();

        // Slot 1 mein save kar rahe hain default
        client.tokenStore.saveToken(interaction.user.id, 1, {
            token,
            username: userData.username,
            discordId: userData.id,
            accountAge: 'Standard'
        });

        await interaction.editReply(`✅ **Slot #1 Linked Successfully!** (${userData.username})`);
    } catch (e) {
        await interaction.editReply('❌ **Token Rejected by Discord!** Sahi token copy karke dalo.');
    }
}
