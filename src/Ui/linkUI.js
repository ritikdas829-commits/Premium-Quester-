import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ThumbnailBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
} from 'discord.js';

export function buildLinkModal(slot = 0) {
    const m = new ModalBuilder().setCustomId(`link_token_modal_${slot}`).setTitle(`Link Slot #${slot + 1}`);
    m.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('link_token_input').setLabel('Discord token').setStyle(TextInputStyle.Short).setRequired(true)));
    return m;
}

export function buildPremiumLinkCard() {
    const c = new ContainerBuilder().setAccentColor(0x2B2D31);
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# Premium Link\n**Terms** - Token will be used for quests.`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export function buildAccountPanel(accounts, member, slotConfig, allowedCount = 5) {
    const c = new ContainerBuilder().setAccentColor(0x2B2D31);
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Account Panel (${allowedCount} Slots)`));
    for (let i = 0; i < allowedCount; i++) {
        const acc = accounts[i];
        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**#${i + 1}** ${acc ? acc.username + ' - Active' : 'Not Linked - Not Active'}`));
        c.addActionRowComponents(new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(acc ? `unlink_${i}` : `link_${i}`).setLabel(acc ? 'Unlink' : 'Link').setStyle(acc ? ButtonStyle.Danger : ButtonStyle.Success)));
        if (i < allowedCount - 1) c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
    }
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export function buildLinkPrompt() {
    const c = new ContainerBuilder().setAccentColor(0xED4245);
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔒 Account Not Linked\nPlease link your account first using the \`;link\` command!`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral };
}

export function buildNoQuestsCard() {
    const c = new ContainerBuilder().setAccentColor(0x4F545C);
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔍 No Quests Available\nThere are no active, uncompleted quests on your account right now.`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export function buildExpiredTokenCard() {
    const c = new ContainerBuilder().setAccentColor(0xED4245);
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ❌ Token Expired\nYour saved token was rejected by Discord — it has likely expired.\n\nPlease re-link your account slot.`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export function buildErrorCard(err) {
    const msg = err?.message ?? String(err);
    const is401 = msg.includes('401');
    const c = new ContainerBuilder().setAccentColor(0xED4245);
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(is401 ? `# ❌ Invalid or Expired Token\nPlease re-link your token.` : `# ❌ Error\n${msg.slice(0, 800)}`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export function buildQuestSelectCard(quests) {
    const ICONS = { PLAY_ON_DESKTOP: '🖥️', WATCH_VIDEO: '🎬', STREAM_ON_DESKTOP: '📺', PLAY_ACTIVITY: '🎮', WATCH_VIDEO_ON_MOBILE: '📱' };
    const lines = quests.map((q, i) => {
        const tasks = (q.config.task_config ?? q.config.task_config_v2)?.tasks ?? {};
        const taskKey = Object.keys(tasks)[0] ?? '';
        const icon = ICONS[taskKey] ?? '⚙️';
        const exp = Math.floor(new Date(q.config.expires_at).getTime() / 1000);
        return `**${i + 1}.** ${icon} **${q.config.messages.quest_name}**\n> ${q.config.messages.game_title} • Expires <t:${exp}:R>`;
    }).join('\n\n');
    const c = new ContainerBuilder().setAccentColor(0x5865F2);
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🎮 ${quests.length} Quest${quests.length !== 1 ? 's' : ''} Available\n${lines}\n\n*Use the dropdown below to pick one.*`));
    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    const menu = new StringSelectMenuBuilder().setCustomId(`quest_select_${Date.now()}`).setPlaceholder('Pick a quest...').addOptions(quests.map((q) => ({ label: q.config.messages.quest_name.slice(0, 100), description: q.config.messages.game_title.slice(0, 100), value: q.id })));
    c.addActionRowComponents(new ActionRowBuilder().addComponents(menu));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

export function buildQuestInfoCard(quest, phase, claimed = 0, failReason = '') {
    const cfg = quest.config; 
    const msgs = cfg.messages; 
    const appId = cfg.application.id;
    const thumbUrl = `https://cdn.discordapp.com/app-assets/${appId}/quest-assets/${cfg.assets.game_tile}.png`;
    const PHASE = {
        starting: { color: 0x5865F2, title: '⚙️ Solving Quest...', bar: '`░░░░░░░░░░`  **0%**  —  *Working...*' },
        done:     { color: 0x57F287, title: '✅ Quest Complete!', bar: '`██████████`  **100%**' },
        failed:   { color: 0xED4245, title: '❌ Quest Failed', bar: '' }
    };
    const p = PHASE[phase];
    const c = new ContainerBuilder().setAccentColor(p.color);
    c.addSectionComponents(new SectionBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ${p.title}\n### ${msgs.quest_name}\n*${msgs.game_title}*`)).setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbUrl)));
    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`📊 **Progress**\n${p.bar}\n\n🎁 **Reward**\n${cfg.rewards_config.rewards.map(r => `**${r.messages.name}**`).join('\n')}`));
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}
