import {bump, determineBumpType} from "./bump";
import type {Bump} from "./bump";

const core = require('@actions/core')
const github = require('@actions/github');
import { Base64 } from 'js-base64';



import commitMessageQuery from 'inline!./src/GetCommitMessageFromRepository.query.graphql'
import lastReleaseQuery from 'inline!./src/GetLastReleaseQuery.query.graphql'
import type {CommitMessageQueryResponse, LatestReleaseQueryResponse} from "./QueryTypes";

const repoDetails = {
    repoName: github.context.repo.repo,
    repoOwner: github.context.repo.owner,
    changelogFile: "CHANGELOG.md"
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
        //Workout latest version from latest release, but have a default in case no release has been manually created
        const latestVersion = latestRelease.repository.latestRelease?.tag.name ? latestRelease.repository.latestRelease?.tag.name : core.getInput('initial_release')

        const bumpType: Bump = determineBumpType(commitMessage.repository.pullRequest.mergeCommit, {
            inputBump: core.getInput('bump'),
            inferBumpFromCommit: core.getInput('infer_bump_from_commit')
        })
        const nextVersion = bump((latestVersion) as string, bumpType)
        const nextReleaseTag = core.getInput('tag_prefix') + nextVersion

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
            if(core.getInput('update_file') == "package.json"){
                //Get input file
                const fileToUpdate = await octokit.request(`GET /repos/{owner}/{repo}/contents/${core.getInput('update_file')}`, {
                repo: repoDetails.repoName,
                owner: repoDetails.repoOwner,
                branch: "main"
            })
                const fileSha = fileToUpdate.data.sha
                var updatedFileContent
                const fileContent = JSON.parse(Base64.decode(fileToUpdate.data.content))
                fileContent.version = nextReleaseTag
                updatedFileContent = Base64.encode(JSON.stringify(fileContent,null,4))
                const updateFileResult = await octokit.request(`PUT /repos/{owner}/{repo}/contents/${core.getInput('update_file')}`, {
                    repo: repoDetails.repoName,
                    owner: repoDetails.repoOwner,
                    message: `Automatic file bump to ${nextReleaseTag}`,
                    branch: "main",
                    sha: fileSha,
                    content: updatedFileContent
                })
                // console.log('updateFileResult', updateFileResult) 
            }else if(core.getInput('update_file') == "version.txt"){
                //Get input file
                const fileToUpdate = await octokit.request(`GET /repos/{owner}/{repo}/contents/${core.getInput('update_file')}`, {
                repo: repoDetails.repoName,
                owner: repoDetails.repoOwner,
                branch: "main"
                })
                const fileSha = fileToUpdate.data.sha
                var updatedFileContent
                updatedFileContent = Base64.encode(nextReleaseTag)
                const updateFileResult = await octokit.request(`PUT /repos/{owner}/{repo}/contents/${core.getInput('update_file')}`, {
                    repo: repoDetails.repoName,
                    owner: repoDetails.repoOwner,
                    message: `Automatic file bump to ${nextReleaseTag}`,
                    branch: "main",
                    sha: fileSha,
                    content: updatedFileContent
                })
                // console.log('updateFileResult', updateFileResult) 
            }else{
                core.setFailed("Your update_file does not exist or it's not supported.");
            }       
        }
        if(core.getInput('changelog')){
            console.log("Input file to be modified is " + repoDetails.changelogFile)
            const fileToUpdate = await octokit.request(`GET /repos/{owner}/{repo}/contents/${repoDetails.changelogFile}`, {
                repo: repoDetails.repoName,
                owner: repoDetails.repoOwner,
                branch: "main"
            })
            const fileSha = fileToUpdate.data.sha
            const fileContent = Base64.decode(fileToUpdate.data.content)
            const changelogDate = new Date()
            let updatedFileContent = Base64.encode(changelogDate.toISOString().split('T')[0] + ", " + nextReleaseTag + "\n\n" + `\t${String.fromCodePoint(0x2022)} ${commitMessage.repository.pullRequest.mergeCommit.messageHeadline} (${commitMessage.repository.pullRequest.mergeCommit.author.name})\n` + fileContent)
            let diffMergedBranch
            console.log("What is merged_branch?" + core.getInput('merged_branch'))
            if(core.getInput('merged_branch')){
                diffMergedBranch = await octokit.request(`GET /repos/{owner}/{repo}/compare/{base}...{head}`, {
                    repo: repoDetails.repoName,
                    owner: repoDetails.repoOwner,
                    base: "main",
                    head: core.getInput('merged_branch')
                })
                console.log("tagDiffs is " + diffMergedBranch.data.html_url)
                updatedFileContent = Base64.encode(changelogDate.toISOString().split('T')[0] + ", " + nextReleaseTag + "\n\n" + `\t${String.fromCodePoint(0x2022)} ${commitMessage.repository.pullRequest.mergeCommit.messageHeadline} (${commitMessage.repository.pullRequest.mergeCommit.author.name})\n + "\tDiff: ${diffMergedBranch.data.html_url}"` + fileContent)
            }
            const changelogResult = await octokit.request(`PUT /repos/{owner}/{repo}/contents/${repoDetails.changelogFile}`, {
                repo: repoDetails.repoName,
                owner: repoDetails.repoOwner,
                message: `Automatic file bump to ${nextReleaseTag}`,
                branch: "main",
                sha: fileSha,
                content: updatedFileContent   
            })
                  
            // console.log('changelogResult', changelogResult)
            
        }
    } catch (error: any) {
        core.setFailed(error.message);
    }

}

start()
