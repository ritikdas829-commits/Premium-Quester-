import { ComponentType, MessageFlags } from 'discord.js';
import { QuestClient } from './questClient.js';
import { Quest } from './quest.js';
import { disableAutoquest, enableAutoquest, isAutoquestEnabled } from './autoquestStore.js';
import { PREFIX } from '../utils/config.js';
import { 
    buildLinkPrompt, 
    buildNoQuestsCard, 
    buildExpiredTokenCard, 
    buildErrorCard, 
    buildQuestSelectCard, 
    buildQuestInfoCard 
} from '../ui/questUI.js';
import { buildQuestListCard, buildMoreQuestsCard } from '../ui/questListUI.js';

export async function runQuestOne(userId, tokenStore, send) {
    const token = tokenStore.getActiveToken(userId);
    if (!token) { await send(buildLinkPrompt()); return false; }

    const qc = new QuestClient(token);
    try {
        const manager = await qc.fetchQuests();
        const valid = manager.filterQuestsValid();
        if (valid.length === 0) { await send(buildNoQuestsCard()); return false; }

        const selMsg = await send(buildQuestSelectCard(valid));

        let selectedId;
        try {
            const interaction = await selMsg.awaitMessageComponent({
                filter: (i) => i.user.id === userId,
                time: 60_000,
                componentType: ComponentType.StringSelect,
            });
            await interaction.deferUpdate();
            selectedId = interaction.values[0];
        } catch {
            const c = new ContainerBuilder().setAccentColor(0xED4245);
            c.addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ⏱️ Timed Out\nNo quest was selected within 60 seconds.`));
            await selMsg.edit({ components: [c], flags: MessageFlags.IsComponentsV2 });
            return false;
        }

        await selMsg.edit({ components: [], flags: MessageFlags.IsComponentsV2 });

        const quest = valid.find((q) => q.id === selectedId);
        const progressMsg = await send(buildQuestInfoCard(quest, 'starting'));

        const logs = [];
        const log = (m) => { console.log(m); logs.push(m); };
        const questDone = await manager.doingQuest(quest, log);

        if (!questDone) {
            const failReason = logs.filter(l => l.startsWith('[FAIL]')).slice(-2).join('\n') || 'Could not be completed automatically.';
            await progressMsg.edit(buildQuestInfoCard(quest, 'failed', 0, failReason));
            return false;
        }

        const claimed = await manager.claimRewards(log).catch(() => 0);
        await progressMsg.edit(buildQuestInfoCard(quest, 'done', claimed));
        return true;

    } catch (err) {
        const msg = err?.message ?? String(err);
        if (msg.includes('401')) {
            await send(buildExpiredTokenCard()).catch(() => {});
        } else {
            await send(buildErrorCard(err)).catch(() => {});
        }
        return false;
    }
}

export async function runQuestAll(userId, tokenStore, send) {
    const token = tokenStore.getActiveToken(userId);
    if (!token) { await send(buildLinkPrompt()); return false; }

    const qc = new QuestClient(token);
    try {
        const manager = await qc.fetchQuests();
        const valid = manager.filterQuestsValid();
        if (valid.length === 0) { await send(buildNoQuestsCard()); return false; }

        const progressMsgs = await Promise.all(valid.map((q) => send(buildQuestInfoCard(q, 'starting'))));

        const questLogs = valid.map(() => []);
        const questResults = await Promise.allSettled(
            valid.map((quest, i) => {
                const log = (m) => { console.log(m); questLogs[i].push(m); };
                return manager.doingQuest(quest, log);
            }),
        );

        const completed = valid.filter((_, i) => questResults[i].status === 'fulfilled' && questResults[i].value === true);
        const skipped   = valid.filter((_, i) => questResults[i].status === 'rejected' || (questResults[i].status === 'fulfilled' && questResults[i].value === false));

        await Promise.allSettled(skipped.map((q) => {
            const idx = valid.indexOf(q);
            const failLogs = questLogs[idx].filter(l => l.startsWith('[FAIL]'));
            const reason = questResults[idx].status === 'rejected'
                ? questResults[idx].reason?.message ?? 'Unknown error'
                : failLogs.slice(-2).join('\n') || 'Could not be completed automatically.';
            return progressMsgs[idx].edit(buildQuestInfoCard(q, 'failed', 0, reason));
        }));

        if (completed.length === 0) return false;

        const claimed = await manager.claimRewards(console.log).catch(() => 0);
        const claimedPer = completed.length > 0 ? Math.floor(claimed / completed.length) : 0;

        await Promise.allSettled(completed.map((q, i) => {
            const idx = valid.indexOf(q);
            return progressMsgs[idx].edit(buildQuestInfoCard(q, 'done', i === 0 ? claimed : claimedPer));
        }));
        return true;

    } catch (err) {
        await send(buildErrorCard(err)).catch(() => {});
        return false;
    }
}

export async function runQuestList(userId, tokenStore, send) {
    const token = tokenStore.getActiveToken(userId);
    if (!token) { await send(buildLinkPrompt()); return; }

    const qc = new QuestClient(token);
    try {
        const manager = await qc.fetchQuests();
        const all = manager.list();
        if (all.length === 0) { await send(buildNoQuestsCard()); return; }

        for (const q of all.slice(0, 10)) {
            const card = buildQuestListCard(q);
            await send(card);
        }

        if (all.length > 10) {
            await send(buildMoreQuestsCard(all.length - 10));
        }
    } catch (err) {
        await send(buildErrorCard(err)).catch(() => {});
    }
}
