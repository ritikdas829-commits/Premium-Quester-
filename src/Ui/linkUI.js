import {
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    MessageFlags,
} from 'discord.js';

// 1. Orbie Premium Jaisa 5-Slot Account Panel UI Card
export function buildAccountPanelCard(slotsData) {
    const c = new ContainerBuilder().setAccentColor(0x2F3136);

    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `# Premium Link\n### Terms & Privacy\nBy linking your Discord token, you allow the premium bot to use it for quest completion. Use \`;script\` if you need the exact token flow guide first.\n\nSupport server: [Click Here](https://discord.gg/codershub)`
        )
    );

    c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
    c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## Account Panel`));

    // 5 Slots Loop
    for (let i = 0; i < 5; i++) {
        const slot = slotsData[i];
        const slotNum = i + 1;

        let slotContent = '';
        const row = new ActionRowBuilder();

        if (slot && slot.linked) {
            slotContent = `### #${slotNum} Account Configuration\n` +
                          `• \`${slot.username}\` (${slot.discordId})\n` +
                          `• Status: **${slot.isActive ? 'Active' : 'Not Active'}**\n` +
                          `• Account Age: ${slot.accountAge}\n` +
                          `• Linked At: ${slot.linkedAt}`;

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`slot_unlink_${slotNum}`)
                    .setLabel('Unlink')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`slot_select_${slotNum}`)
                    .setLabel('Select')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(slot.isActive)
            );
        } else {
            slotContent = `### #${slotNum} Account Configuration\n` +
                          `• Not Linked (Premium Slot)\n` +
                          `• Status: Not Active\n` +
                          `• Account Age: N/A\n` +
                          `• Linked At: N/A`;

            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`slot_link_${slotNum}`)
                    .setLabel('Link')
                    .setStyle(ButtonStyle.Success)
            );
        }

        c.addTextDisplayComponents(new TextDisplayBuilder().setContent(slotContent));
        c.addActionRowComponents(row);

        if (i < 4) {
            c.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false));
        }
    }

    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}

// 2. Token Input Modal (Jispe user click karke token daalega)
export function buildLinkModal(slotNumber = 1) {
    const modal = new ModalBuilder()
        .setCustomId(`link_modal_${slotNumber}`)
        .setTitle(`Link Account - Slot #${slotNumber}`);

    const tokenInput = new TextInputBuilder()
        .setCustomId('token_input')
        .setLabel('Your Discord Token')
        .setPlaceholder('Paste your token here (mfa.xxxxx...)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(tokenInput));
    return modal;
}

// 3. Expired / Error Card
export function buildExpiredTokenCard() {
    const c = new ContainerBuilder().setAccentColor(0xED4245);
    c.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            `# ❌ Token Expired\nYour saved token was rejected by Discord — it has likely expired.\n\nPlease re-link your account slot using the panel.`
        )
    );
    return { components: [c], flags: MessageFlags.IsComponentsV2 };
}
