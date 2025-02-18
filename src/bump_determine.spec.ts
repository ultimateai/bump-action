import {determineBumpType} from "./bump";
import {CommitMessageQueryResponse, MergeCommit} from "./QueryTypes";

const EMPTY_COMMIT_MESSAGE = {
    messageBody: '',
    messageHeadline: '',
    author:{
        name:''
    }
}

describe('determine bump', () => {
    it('inputBump overrides everything else', () => {
        expect(determineBumpType(EMPTY_COMMIT_MESSAGE, {
            inputBump: 'minor',
            inferBumpFromCommit: false
        })).toBe('minor')

        expect(determineBumpType(EMPTY_COMMIT_MESSAGE, {
            inputBump: 'patch',
            inferBumpFromCommit: false
        })).toBe('patch')

        expect(determineBumpType(EMPTY_COMMIT_MESSAGE, {
            inputBump: 'major',
            inferBumpFromCommit: false
        })).toBe('major')
    })
    it('inputBump fails on bad inputBump', () => {
        expect(() => determineBumpType(EMPTY_COMMIT_MESSAGE, {
            inputBump: 'invalid',
            inferBumpFromCommit: false
        })).toThrow(`provided input to bump: "invalid", must be one of patch or fix, minor or feat, major or breaking.`)
    })
    it('infer from commit. commit ambiguous ', () => {
        expect(determineBumpType({
            messageHeadline: 'lorem ipsum',
            messageBody: '...',
            author: {
                name:''
            }
        }, {
            inputBump: '',
            inferBumpFromCommit: true
        })).toBe('patch')
    })
    it('infer from commit. commit clear ', () => {
        expect(determineBumpType({
            messageHeadline: 'minor Added small feature',
            messageBody: '...',
            author: {
                name:''
            }
        }, {
            inputBump: '',
            inferBumpFromCommit: true
        })).toBe('minor')

        expect(determineBumpType({
            messageHeadline: 'major Breaking changes ahead',
            messageBody: '...',
            author: {
                name:''
            }
        }, {
            inputBump: '',
            inferBumpFromCommit: true
        })).toBe('major')

        expect(determineBumpType({
            messageHeadline: 'Breaking something, changes ahead',
            messageBody: '...',
            author: {
                name:''
            }
        }, {
            inputBump: '',
            inferBumpFromCommit: true
        })).toBe('breaking')
    })
})