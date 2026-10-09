export function getAllowedSlots(member, slotConfig) {
    if (!member) return { count: 0, reason: 'no_member' };
    if (member?.roles?.cache?.has(slotConfig?.premium)) return { count: 5, reason: 'premium' };
    if (member?.roles?.cache?.has(slotConfig?.temp3)) return { count: 3, reason: 'temp30' };
    if (member?.roles?.cache?.has(slotConfig?.booster)) return { count: 2, reason: 'booster' };
    if (member?.roles?.cache?.has(slotConfig?.trial)) return { count: 1, reason: 'trial' };
    return { count: 0, reason: 'no_role' };
}
