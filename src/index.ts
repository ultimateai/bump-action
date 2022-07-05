import {bump, determineBumpType} from "./bump";
import type {Bump} from "./bump";

const core = require('@actions/core')
const github = require('@actions/github');
const githubChangeRemoteFile = require("github-change-remote-file")
const semver = require("semver")

import commitMessageQuery from 'inline!./src/GetCommitMessageFromRepository.query.graphql'
import lastReleaseQuery from 'inline!./src/GetLastReleaseQuery.query.graphql'
import type {CommitMessageQueryResponse, LatestReleaseQueryResponse} from "./QueryTypes";
import { parse } from "path";

const repoDetails = {
    repoName: github.context.repo.repo,
    repoOwner: github.context.repo.owner,
}
const start = async () => {
    try {
        const octokit = github.getOctokit(core.getInput('github_token'))

        const commitMessage: CommitMessageQueryResponse = await octokit.graphql(commitMessageQuery, {
            ...repoDetails,
            prNumber: github.context.payload.pull_request?.number
        })

        const latestRelease: LatestReleaseQueryResponse = await octokit.graphql(lastReleaseQuery, {
            ...repoDetails
        })

        const latestVersion = latestRelease.repository.latestRelease.tag.name

        const bumpType: Bump = determineBumpType(commitMessage.repository.pullRequest.mergeCommit, {
            inputBump: core.getInput('bump'),
            inferBumpFromCommit: core.getInput('infer_bump_from_commit')
        })
        const nextVersion = bump((latestVersion || '0') as string, bumpType)

        const nextReleaseTag = core.getInput('tag_prefix') + nextVersion
        core.setOutput('next_version', nextReleaseTag)

        const releaseResult = await octokit.request('POST /repos/{owner}/{repo}/releases', {
            repo: repoDetails.repoName,
            owner: repoDetails.repoOwner,
            tag_name: nextReleaseTag,
            target_commitish: 'main',
            name: commitMessage.repository.pullRequest.mergeCommit.messageHeadline,
            body: commitMessage.repository.pullRequest.mergeCommit.messageBody,
            draft: false,
            prerelease: false,
            generate_release_notes: false
        })
        console.log("Rob testing random things hehe")
        console.log(core.getInput('update_file'))
        console.log("Just before the if")
        if(core.getInput('update_file')){
            console.log("A file will be updated according to the bumped release")
            switch(core.getInput('update_file').trim()){
                case "package.json":
                    githubChangeRemoteFile({
                        user: repoDetails.repoOwner,
                        repo: repoDetails.repoName,
                        filename: 'package.json',
                        transform: (pkg: string) => {
                          const parsedPkg = JSON.parse(pkg)
                          parsedPkg.version = nextReleaseTag
                          return JSON.stringify(parsedPkg, null, 2)
                        },
                        token: core.getInput('github_token')
                      })
                      .then((res: string) => console.log(res))
                      .catch(console.log)
                      break
                default:
                    console.log("Your desired update file is not within the accepted options")
            }
        }
        

        // console.log('releaseResult', releaseResult)
    } catch (error: any) {
        core.setFailed(error.message);
    }

}

start()
