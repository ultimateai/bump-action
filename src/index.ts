import {bump, determineBumpType} from "./bump";
import type {Bump} from "./bump";

const core = require('@actions/core')
const github = require('@actions/github');
const githubChangeRemoteFile = require("github-change-remote-file")
import { Base64 } from 'js-base64';



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
        // console.log('releaseResult', releaseResult)
        if(core.getInput('update_file')){
            console.log("Input file to be modified is " + core.getInput('update_file'))
            // Clone repo 
            console.log("this clearly works")
            const fileToUpdate = await octokit.request(`GET /repos/{owner}/{repo}/contents/${core.getInput('update_file')}`, {
                repo: repoDetails.repoName,
                owner: repoDetails.repoOwner,
                branch: "main"
            })
            const fileSha = fileToUpdate.data.sha
            const fileContent = JSON.parse(Base64.decode(fileToUpdate.data.content))
            fileContent.version = nextReleaseTag
            const updatedFileContent = Base64.encode(JSON.stringify(fileContent))

            console.log("El nuevo content es " + updatedFileContent)
            const packageJsonResult = await octokit.request(`PUT /repos/{owner}/{repo}/contents/${core.getInput('update_file')}`, {
                repo: repoDetails.repoName,
                owner: repoDetails.repoOwner,
                message: "ci update",
                branch: "main",
                sha: fileSha,
                content: updatedFileContent
            })
            console.log("packageJsonResult", packageJsonResult)
            
        }
    } catch (error: any) {
        core.setFailed(error.message);
    }

}

start()
