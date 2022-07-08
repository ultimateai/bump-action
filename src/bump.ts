import {CommitMessageQueryResponse, MergeCommit} from "./QueryTypes";

export type Bump = 'major' | 'breaking' | 'minor' | 'feat' | 'patch' | 'fix';

export const bump = (version: string, bump: Bump) => {
    const cleanVersionMatcher = version.match(/[^\d]*((\d+)\.(\d+)\.(\d+)).*/);
    if (cleanVersionMatcher == null || cleanVersionMatcher[1] === null) {
        throw new Error(`invalid semver: ${version}`)
    }
    const cleanVersion = cleanVersionMatcher[1];
    const parts = cleanVersion.split('.').map((p) => parseInt(p));
    if (bump === 'patch' || bump === 'fix') {
        parts[2]++;
    } else if (bump === 'minor' || bump === 'feat') {
        parts[1]++;
        parts[2] = 0;
    } else if (bump === 'major' || bump === 'breaking') {
        parts[0]++;
        parts[1] = parts[2] = 0;
    }
    return parts.join('.');
};

type DetermineBumpTypeOptions = {
    inputBump: string,
    inferBumpFromCommit: boolean
}

const inferBumpFromCommit = (commit: MergeCommit): Bump => {
    const firstWordMatch = /(\w+)\b.*/.exec(commit.messageHeadline)
    if (firstWordMatch) {
        const firstWord = firstWordMatch[1].toLowerCase()
        if (BUMPS.includes(firstWord)) {
            return firstWord as Bump
        }
    }
    return 'patch'
}

const BUMPS: string[] = ['patch','fix','minor','feat','major','breaking']
export const determineBumpType = (commit: MergeCommit, options: DetermineBumpTypeOptions): Bump => {
    if (options.inputBump) {
        if (!BUMPS.includes(options.inputBump.toLowerCase() as Bump)) {
            throw `provided input to bump: "${options.inputBump}", must be one of patch or fix, minor or feat, major or breaking.`
        } else {
            return options.inputBump.toLowerCase() as Bump
        }
    }

    if (options.inferBumpFromCommit) {
        return inferBumpFromCommit(commit)
    }

    return 'patch'
}