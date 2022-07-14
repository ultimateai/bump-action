export type author = {
    name: string
}

export type MergeCommit = {
    messageBody: string
    messageHeadline: string
    author: author
}
export type CommitMessageQueryResponse = {
    repository: {
        pullRequest: {
            mergeCommit: MergeCommit        }
    }
}

export type LatestReleaseQueryResponse = {
    repository: {
        latestRelease: {
            tag: {
                id: string
                name: string
                prefix: string
            }
        }
    }
}