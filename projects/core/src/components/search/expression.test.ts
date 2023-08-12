import {describe, test, beforeEach, afterEach, expect} from "@jest/globals"
import {DBSearchExpression} from "./expression"

import isToken = DBSearchExpression.Tokenize.isToken
import tokenize = DBSearchExpression.Tokenize.tokenize
import TokenTypes = DBSearchExpression.Tokenize.Types

describe("search-tokenization", () => {    
    test("empty", () => {
        expect(tokenize("").length).toBe(0)
    })

    test("values", () => {
        const tokens = tokenize(`aaa bbb ccc "aa aa" 'bb bb' "aa \\" bb" 'aa \\' bb' "aa ' bb" 'aa " bb'`)
        const values: string[] = []
        for(const t of tokens) {
            if(isToken(TokenTypes.Value, t)) {
                values.push(t.options.content)
            } else {
                expect(isToken(TokenTypes.Space, t)).toBeTruthy()
            }
        }
        expect(values).toStrictEqual([`aaa`, `bbb`, `ccc`, `aa aa`, `bb bb`, `aa " bb`, `aa ' bb`, `aa ' bb`, `aa " bb`])
    })

    test("property", () => {
        const [t1, t2, t3] = tokenize(`/a/b/c/d="/a/b/c/d"`)
        console.log(t1, t2, t3)
        if(isToken(TokenTypes.Path, t1)) {
            expect(t1.options.path).toBe("/a/b/c/d")
        } else {
            throw t1.type
        }

        if(isToken(TokenTypes.Symbol, t2)) {
            expect(t2.options.symbol).toBe('=')
        } else {
            throw t2.type
        }

        if(isToken(TokenTypes.Value, t3)) {
            expect(t3.options.content).toBe("/a/b/c/d")
        } else {
            throw t3.type
        }

        const [t4] = tokenize("/a/b/c/d")
        expect(t4.type).toBe(TokenTypes.Path)
    })

    test("symbols", () => {
        const tokens = tokenize(`%linkTo(id=233 type=?)  $or(a b c d) -exclude "xxx xxx"`)
        const values: string[] = []
        for(const t of tokens) {
            if(isToken(TokenTypes.Symbol, t)) {
                values.push(t.options.symbol)
            } else if(isToken(TokenTypes.Value, t)) {
                values.push(t.options.content)
            } else if(isToken(TokenTypes.Path, t)) {
                values.push(t.options.path)
            }
        }

        expect(values.join(" ")).toBe("% linkTo ( id = 233 type = ? ) $ or ( a b c d ) - exclude xxx xxx")
    })
})

describe("search-ast", () => {
    test("happy-case", () => {
        const expr = `a b c d -and e -or /f/g=hhh -and $or( %linkTo( id=i ) -exclude (j -and (k)) )`
        const result = DBSearchExpression.AST.parse(expr)
        // console.log(JSON.stringify(result, null, 2))
    })

    test("half-infix", () => {
        const expr = `a -and `
        expect(() => DBSearchExpression.AST.parse(expr)).toThrow(DBSearchExpression.SyntaxError)
    })

    test("half-bracket-left", () => {
        const expr = `a ( b`
        expect(() => DBSearchExpression.AST.parse(expr)).toThrow(DBSearchExpression.SyntaxError)
    })

    test("half-bracket-right", () => {
        const expr = `a ) c`
        expect(() => DBSearchExpression.AST.parse(expr)).toThrow(DBSearchExpression.SyntaxError)
    })
})