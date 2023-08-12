import {DBSearch} from "./query"

/**
 * Tokens:
 *      /property/path=<value>
 *      $<aggregate>(<args>)
 *      %function(arg1: value1, arg2: value2)
 *      <left> -<infix> <right> 
 *      value: <value> | "value with spaces" | 'inside a quote'
 * Aggregate contexts:
 *      - every, default
 *      - one
 * Examples:
 *      catboy /age=shota $one("genshin impact" arknights $every() -exclude %linkTo(233333)) 
 */

/**
 * <top>: <list>                        #top aggregate
 * <list>:  <infix>
 *          | <list> <infix>
 * <infix>: <term>                      #infix
 *          | <infix> -<value> <term>
 * <term>:  ( <infix> )
 *          | <fullText>
 *          | <property>
 *          | <function>
 *          | <aggregate>
 * <fullText>: <value>                  #fullText
 * <property>: <path> = <value>         #property
 * <function>: % <value> ( <argList> )  #function
 * <argList>:   <null>
 *              | <argItem>
 *              | <argList> <argItem>
 * <argItem>: <value> = <value>
 * <aggregate>: $ <value> ( <list> )    #aggregate
 * <path> e.g. /a/b/c/d
 * <value> e.g. abc | "a b c" | 'a b c'
 * 
 * a: b | b a =>
 * 
 */

import Query = DBSearch.Query

export module DBSearchExpression {
    

    interface Position {
        row: number
        col: number
        offset: number
    }

    function error(message: string, source?: string, pos?: Position): never {
        if(source && pos) {
            const row = source.split("\n")[pos.row]
            const pointer = " ".repeat(pos.col) + "^"
            throw new SyntaxError(`${message}\nat row ${pos.row} col ${pos.col}\n${row}\n${pointer}`)
        } else {
            throw new SyntaxError(message)    
        }
    }

    export module Tokenize {
        export enum Types {
            Symbol = "symbol",
            Path = "path",
            Space = "space",
            Value = "value"
        }

        export enum AcceptedSymbols {
            InfixPrefix="-",
            FuncPrefix="%",
            AggPrefix='$',
            Equal="=",
            LeftBracket="(",
            RightBracket=")"
        }

        export enum Quotes {
            Single = "'",
            Double = '"'
        }

        export type Payloads = {
            symbol: {symbol: AcceptedSymbols},
            path: {path: string}
            space: {},
            value: {content: string, quote: Quotes | null}
        }

        export interface Token<N extends Types> {
            type: N,
            options: Payloads[N]
            startAt: Position
            endAt: Position
            content: string
        }

        export function isToken<N extends Types>(type: N, token: Token<Types>): token is Token<N> {
            return token.type === type
        }

        export function isTokenType(s: string): s is Types {
            return Object.values(Types).includes(s as any)
        }

        export function isSymbol(s: string): s is AcceptedSymbols {
            return Object.values(AcceptedSymbols).includes(s as any)
        }

        export function tokenize(s: string): Token<Types>[] {
            return new Tokenizer(s).tokenize()
        }

        class Tokenizer {
            offset: number = 0
            row: number = 0
            col: number = 0

            constructor(private raw: string) {}

            tokenize(): Token<Types>[] {
                const tokens: Token<Types>[] = []
                while(this.current() !== null) {
                    const pos = this.pos()
                    const token = this.tryParseSpace() ?? this.tryParseSymbol() ?? this.tryParsePath() ?? this.tryParseValue()
                    if(!token) {
                        error("Invalid token.", this.raw, pos)
                    }
                    tokens.push(token)
                }
                return tokens
            }

            tryParseSymbol(): Token<Types.Symbol> | null {
                const current = this.current()
                if(current == null) {
                    return null
                }

                if(!this.isSymbol(current)) {
                    return null
                }

                const startAt = this.pos()
                this.next()
                const endAt = this.pos()
                return {
                    type: Types.Symbol,
                    options: {
                        symbol: current
                    },
                    content: current,
                    startAt, endAt
                }
            }

            tryParsePath(): Token<Types.Path> | null {
                const current = this.current()
                if(current == null) {
                    return null
                }

                if(current !== "/") {
                    return null
                }

                const start = this.pos()
                while(this.current()?.match(/^\w|\/$/)) {
                    this.next()
                }
                if(this.offset === start.offset) {
                    return null
                }

                
                const path = this.raw.slice(start.offset, this.pos().offset)

                const content = this.raw.slice(start.offset, this.pos().offset)

                return {
                    type: Types.Path,
                    content,
                    options: {
                        path
                    },
                    startAt: start,
                    endAt: this.pos(),
                }
            }

            tryParseSpace(): Token<Types.Space> | null {
                const current = this.current()
                if(current == null) {
                    return null
                }

                const start = this.pos()
                while(this.isSpace(this.current())) {
                    this.next()
                }
                if(this.offset === start.offset) {
                    return null
                }

                const end = this.pos()

                const content = this.raw.slice(start.offset, end.offset)

                return {
                    type: Types.Space,
                    options: {},
                    startAt: start,
                    endAt: end,
                    content
                }
            }

            tryParseValue(): Token<Types.Value> | null {
                const current = this.current()
                if(current == null) {
                    return null
                }

                let quote: Quotes | null = null
                const start = this.pos()
                if(current === Quotes.Single || current === Quotes.Double) {
                    quote = current
                    this.next()
                }

                let escaped = false

                while(
                    this.current() !== null &&
                    !(quote !== null && !escaped && this.current() === quote) &&
                    !(quote === null && (
                        this.isSpace(this.current()) ||
                        this.isSymbol(this.current() ?? "")
                    ))
                ) {
                    escaped = !!quote && this.current() === "\\"
                    this.next()
                }
                if(this.offset === start.offset) {
                    return null
                }


                let content: string
                if(quote) {
                    content = this.raw.slice(start.offset+1, this.offset)
                    content = replaceAll(content, '\\' + quote, quote)
                } else {
                    content = this.raw.slice(start.offset, this.offset)
                }

                if(quote) {
                    this.next()
                }

                const end = this.pos()

                return {
                    type: Types.Value,
                    options: {content, quote},
                    startAt: start,
                    endAt: end,
                    content: this.raw.slice(start.offset, end.offset)
                }
            }

            isSpace(s: string | null): s is string {
                return s === " " || s === "\n" || s === "\t"
            }

            isSymbol(s: string): s is AcceptedSymbols {
                return Object.values(AcceptedSymbols).includes(s as any)
            }

            pos(): Position {
                return {
                    offset: this.offset,
                    row: this.row,
                    col: this.col
                }
            }

            current(): string | null {
                if(this.offset >= this.raw.length) {
                    return null
                } else {
                    return this.raw.charAt(this.offset)
                }
            }

            next() {
                if(this.current() === "\n") {
                    this.row ++
                    this.col = 0
                } else {
                    this.col ++
                }
                this.offset ++
            }
        }
    }

    export module AST {
        export type ASTRoot = AstNode<NodeTypes.Infix>[]

        export function parse(input: string): ASTRoot {
            const tokens = Tokenize.tokenize(input)
            return new Parser(input, tokens).parse()
        }

        export enum NodeTypes {
            Infix = "infix",
            Term = "term",
            FullText = "fullText",
            Property = "property",
            Function = "function",
            ArgItem = "argItem",
            Aggregate = "aggregate",
            Path = "path",
            Value = "value"
        }

        export type Payloads = {
            infix: {
                left: AstNode<NodeTypes.Term>
                rest: InfixRestItem[]
            }
            term: {
                content: AstNode<NodeTypes.Infix> 
                        |   AstNode<NodeTypes.FullText>
                        |   AstNode<NodeTypes.Property>
                        |   AstNode<NodeTypes.Function>
                        |   AstNode<NodeTypes.Aggregate> 
            }
            fullText: {value: AstNode<NodeTypes.Value>}
            property: {
                path: AstNode<NodeTypes.Path>,
                value: AstNode<NodeTypes.Value>
            }
            function: {name: AstNode<NodeTypes.Value>, argList: AstNode<NodeTypes.ArgItem>[]}
            argItem: {name: AstNode<NodeTypes.Value>, value: AstNode<NodeTypes.Value>}
            aggregate: {
                name: AstNode<NodeTypes.Value>,
                contentList: AstNode<NodeTypes.Infix>[]
            }
            path: {
                content: string
            }
            value: {
                content: string
            }
        }

        type InfixRestItem = {
            infix: AstNode<NodeTypes.Value>
            right: AstNode<NodeTypes.Term>
        }

        export interface AstNode<N extends NodeTypes> {
            type: N
            options: Payloads[N]
            pos: Position
        }

        export function isNode<N extends NodeTypes>(type: N, node: AstNode<NodeTypes>): node is AstNode<N> {
            return node.type === type
        }

        class Parser {
            offset: number = 0
    
            constructor(private source: string, private tokens: Tokenize.Token<Tokenize.Types>[]) {}
    
            parse(): AstNode<NodeTypes.Infix>[] {
                this.tokens = this.tokens.filter(it => !Tokenize.isToken(Tokenize.Types.Space, it))
                const result: AstNode<NodeTypes.Infix>[] = []
                let infix = this.tryInfix()
                while(infix) {
                    result.push(infix)
                    infix = this.tryInfix()
                }
                if(this.offset < this.tokens.length) {
                    this.error("Syntax error.")
                }
                return result
            }

            tryInfix(): null | AstNode<NodeTypes.Infix> {
                const left = this.tryTerm()
                if(!left) {
                    return null;
                }
                const rest: InfixRestItem[] = []
                while(this.matchForward([Tokenize.AcceptedSymbols.InfixPrefix])) {
                    const name = this.must(() => this.tryValue())
                    const right = this.must(() => this.tryTerm())
                    rest.push({infix: name, right})
                }

                return {
                    type: NodeTypes.Infix,
                    options: {
                        left,
                        rest
                    },
                    pos: left.pos
                }
            }

            tryTerm(): null | AstNode<NodeTypes.Term> {
                const prefix = this.matchForward([Tokenize.AcceptedSymbols.LeftBracket])
                if(prefix) {
                    const [leftBracket] = prefix
                    const infix = this.must(() => this.tryInfix())
                    this.expectRightBracket()

                    return {
                        type: NodeTypes.Term,
                        options: {content: infix},
                        pos: leftBracket.startAt
                    }
                } else {
                    const content = this.tryAggregate() ??
                                    this.tryFunction() ??
                                    this.tryProperty() ??
                                    this.tryFullText()
                    if(!content) {
                        return null
                    }
                    return {
                        type: NodeTypes.Term,
                        options: {content},
                        pos: content.pos
                    }
                }
            }

            tryAggregate(): null | AstNode<NodeTypes.Aggregate> {
                const prefix = this.matchForward([Tokenize.AcceptedSymbols.AggPrefix])
                if(!prefix) {
                    return null
                }
                const name = this.must(() => this.tryValue())
                this.expectLeftBracket()

                const items: AstNode<NodeTypes.Infix>[] = []
                while(!this.isRightBracket()) {
                    items.push(this.must(() => this.tryInfix()))
                }

                return {
                    type: NodeTypes.Aggregate,
                    options: {
                        name,
                        contentList: items
                    },
                    pos: prefix[0].startAt
                }
            }

            tryFunction(): null | AstNode<NodeTypes.Function> {
                const prefix = this.matchForward([Tokenize.AcceptedSymbols.FuncPrefix])
                if(!prefix) {
                    return null
                }

                const name = this.must(() => this.tryValue())
                this.expectLeftBracket()

                const items: AstNode<NodeTypes.ArgItem>[] = []
                while(!this.isRightBracket()) {
                    items.push(this.argItem())
                }
                return {
                    type: NodeTypes.Function,
                    options: {
                        name,
                        argList: items
                    },
                    pos: prefix[0].startAt
                }
            }

            expectLeftBracket() {
                this.must(() => this.matchForward([Tokenize.AcceptedSymbols.LeftBracket]))
            }

            expectRightBracket() {
                this.must(() => this.matchForward([Tokenize.AcceptedSymbols.RightBracket]))
            }

            isRightBracket() {
                return !!this.matchForward([Tokenize.AcceptedSymbols.RightBracket])
            }

            argItem(): AstNode<NodeTypes.ArgItem> {
                const name = this.must(() => this.tryValue())
                this.must(() => this.matchForward([Tokenize.AcceptedSymbols.Equal]))
                const value = this.must(() => this.tryValue())

                return {
                    type: NodeTypes.ArgItem,
                    options: {
                        name,
                        value
                    },
                    pos: name.pos
                }
            }

            tryProperty(): null | AstNode<NodeTypes.Property> {
                const m = this.matchForward([Tokenize.Types.Path, Tokenize.AcceptedSymbols.Equal])
                if(!m) return null;
                const [path, _eq] = m
                const value = this.must(() => this.tryValue())
                return {
                    type: NodeTypes.Property,
                    options: {
                        path: {
                            type: NodeTypes.Path,
                            options: {
                                content: path.options.path
                            },
                            pos: path.startAt
                        },
                        value
                    },
                    pos: path.startAt
                }
            }

            tryFullText(): null | AstNode<NodeTypes.FullText> {
                const value = this.tryValue()
                if(!value) return null;
                return {
                    type: NodeTypes.FullText,
                    options: {value},
                    pos: value.pos
                }
            }
    
            tryPath(): null | AstNode<NodeTypes.Path> {
                const paths = this.matchForward([Tokenize.Types.Path])
                if(paths) {
                    const [path] = paths
                    return this.convertPath(path)
                } else {
                    return null
                }
            }

            convertPath(path: Tokenize.Token<Tokenize.Types.Path>): AstNode<NodeTypes.Path> {
                return {
                    type: NodeTypes.Path,
                    options: {content: path.options.path},
                    pos: path.startAt
                }
            }
    
            tryValue(): null | AstNode<NodeTypes.Value> {
                const paths = this.matchForward([Tokenize.Types.Path])
                if(paths) {
                    const [path] = paths
                    return this.convertValue(path)
                }

                const values = this.matchForward([Tokenize.Types.Value])
                if(values) {
                    const [value] = values
                    return this.convertValue(value)
                }

                return null
            }

            convertValue(token: Tokenize.Token<Tokenize.Types.Path> | Tokenize.Token<Tokenize.Types.Value>): AstNode<NodeTypes.Value> {
                let content: string
                if(Tokenize.isToken(Tokenize.Types.Path, token)) {
                    content = token.options.path
                } else {
                    content = token.options.content
                }
                return {
                    type: NodeTypes.Value,
                    options: {content},
                    pos: token.startAt
                }
            }
    
            trySymbol(s: Tokenize.AcceptedSymbols): null | Tokenize.Token<Tokenize.Types.Symbol> {
                const result = this.matchForward([s])
                if(!result) {
                    return null
                }
                const [sym] = result
                return sym
            }

            matchForward<const Pat extends TokenMatchBase>(pattern: Pat, moveOffset = true): null | MatchTokenResult<Pat> {
                const forwardTokens: Tokenize.Token<Tokenize.Types>[] = []
                for(let i=0; i<pattern.length; i++) {
                    const t = this.tokens[this.offset + i]
                    const p = pattern[i]
                    if(!t) return null;
                    if(Tokenize.isTokenType(p) && t.type === p) {
                        forwardTokens.push(t)
                    } else if (Tokenize.isSymbol(p) && Tokenize.isToken(Tokenize.Types.Symbol, t) && t.content === p) {
                        forwardTokens.push(t)
                    } else {
                        return null;
                    }
                }
                if(moveOffset) {
                    this.offset += forwardTokens.length
                }
                return forwardTokens as MatchTokenResult<Pat>
            }

            must<R>(fn: () => null | R): R {
                const result = fn()
                if(result === null) {
                    this.error("Syntax error.")
                }
                return result
            }
            
            isToken<N extends Tokenize.Types>(type: N, token: Tokenize.Token<Tokenize.Types>): token is Tokenize.Token<N> {
                return type === token.type
            }
    
            error(message: string): never {
                let pos: Position
                const token = this.tokens[this.offset]
                if(token) {
                    pos = token.startAt
                } else {
                    pos = this.tokens[this.tokens.length-1].endAt
                }
                error(message, this.source, pos)
            }
        }

        type TokenMatchBase = readonly (Tokenize.Types | Tokenize.AcceptedSymbols)[]

        type MatchTokenResult<Pat extends TokenMatchBase> = (
            Pat extends readonly [] ?
                []:
            Pat extends readonly [infer First, ...infer Rest] ?
                First extends Tokenize.Types | Tokenize.AcceptedSymbols ?
                    Rest extends TokenMatchBase ?
                        [(First extends Tokenize.Types ? Tokenize.Token<First> : Tokenize.Token<Tokenize.Types.Symbol>), ...MatchTokenResult<Rest>]:
                        never:
                    never:
                never
        )   
    }

    export module Parse {
        export type Result<Opt extends Query.OptBase> = { success: true, query: Query.QueryBase<Opt> } | {success: false, message: string}

        export interface IResolver<Opt extends Query.OptBase> {
            readonly topAggregate: Opt["Aggregates"]
            validateAggregate(n: string): n is Opt["Aggregates"]
            validateInfix(n: string): n is Opt["Infix"]
            validateFunction(n: string): n is Extract<keyof Opt["Functions"], string>
        }

        export function parse<Opt extends Query.OptBase>(source: string, resolver: IResolver<Opt>): Result<Opt> {
            try {
                const ast = AST.parse(source)
                const query = convert(source, ast, resolver)
                return {
                    success: true,
                    query
                }
            } catch(ex) {
                if(ex instanceof SyntaxError) {
                    console.error(ex)
                    return {
                        success: false,
                        message: ex.message
                    }
                } else {
                    throw ex
                }
            }
        }

        export function convert<Opt extends Query.OptBase>(source: string, root: AST.ASTRoot, resolver: IResolver<Opt>): Query.QueryBase<Opt> {
            const c = new Converter(source, resolver)
            const queries = root.map(it => c.onInfix(it))
            if(!resolver.topAggregate) {
                throw new Error("Missing top aggregate.")
            }
            return {
                type: Query.Types.Aggregate,
                options: {
                    type: resolver.topAggregate,
                    children: queries
                }
            }
        }

        class Converter<Opt extends Query.OptBase> {
            constructor(private source: string, private resolver: IResolver<Opt>) {}

            onInfix(node: AST.AstNode<AST.NodeTypes.Infix>): Query.QueryBase<Opt> {
                let left = this.onTerm(node.options.left)
                for(const {infix, right} of node.options.rest) {
                    const r = this.onTerm(right)
                    if(!this.resolver.validateInfix(infix.options.content)) {
                        this.error(`Unknown infix ${infix}.`, infix)
                    }
                    left = this.createInfix(left, infix.options.content, r)
                }
                return left
            }

            onTerm(node: AST.AstNode<AST.NodeTypes.Term>): Query.QueryBase<Opt> {
                const internal = node.options.content
                if(AST.isNode(AST.NodeTypes.Infix, internal)) {
                    return this.onInfix(internal)
                } else if(AST.isNode(AST.NodeTypes.Aggregate, internal)) {
                    return this.onAggregate(internal)
                } else if(AST.isNode(AST.NodeTypes.Function, internal)) {
                    return this.onFunction(internal)
                } else if(AST.isNode(AST.NodeTypes.FullText, internal)) {
                    return this.onFullText(internal)
                } else if(AST.isNode(AST.NodeTypes.Property, internal)) {
                    return this.onProperty(internal)
                } else {
                    this.error(`Invalid state.`, node)
                }
            }

            onFullText(node: AST.AstNode<AST.NodeTypes.FullText>): Query.Query<Query.Types.FullText, Opt> {
                const term = node.options.value.options.content
                return {
                    type: Query.Types.FullText,
                    options: {term}
                }
            }

            onAggregate(node: AST.AstNode<AST.NodeTypes.Aggregate>): Query.Query<Query.Types.Aggregate, Opt> {
                const name = node.options.name.options.content
                if(!this.resolver.validateAggregate(name)) {
                    this.error(`Unknown aggregate ${name}`, node.options.name)
                }
                const children = node.options.contentList.map(it => this.onInfix(it))
                return {
                    type: Query.Types.Aggregate,
                    options: {
                        type: name,
                        children
                    }
                }
            }

            onProperty(node: AST.AstNode<AST.NodeTypes.Property>): Query.Query<Query.Types.Property, Opt> {
                return {
                    type: Query.Types.Property,
                    options: {
                        property: node.options.path.options.content,
                        value: node.options.value.options.content
                    }
                }
            }

            onFunction(node: AST.AstNode<AST.NodeTypes.Function>): Query.Query<Query.Types.Function, Opt> {
                const name = node.options.name.options.content
                if(!this.resolver.validateFunction(name)) {
                    this.error(`Unknown function ${name}`, node.options.name)
                }

                const args: Record<string, string> = {}
                for(const arg of node.options.argList) {
                    args[arg.options.name.options.content] = arg.options.value.options.content
                }

                return {
                    type: Query.Types.Function,
                    options: {
                        name,
                        parameters: args as any
                    }
                }
            }

            createInfix(left: Query.QueryBase<Opt>, infix: Opt["Infix"], right: Query.QueryBase<Opt>): Query.Query<Query.Types.Infix, Opt> {
                return {
                    type: Query.Types.Infix,
                    options: {
                        left, right,
                        type: infix
                    }
                }
            }

            error(message: string, node: AST.AstNode<AST.NodeTypes>): never {
                error(message, this.source, node.pos)
            }
        }
    }

    export module Dump {
        export function dump(query: Query.QueryBase<Query.OptBase>, removeTopAggregate: boolean = true): string {
            if(removeTopAggregate && Query.isQueryOfType(Query.Types.Aggregate, query)) {
                return query.options.children.map(it => dump(it, false)).join(" ")
            } else {
                return new Convertor().onAny(query)
            }
        }

        class Convertor {
            onAny(q: Query.QueryBase<Query.OptBase>): string {
                if(Query.isQueryOfType(Query.Types.Infix, q)) {
                    return this.onInfix(q)
                } else if(Query.isQueryOfType(Query.Types.Aggregate, q)) {
                    return this.onAggregate(q)
                } else if(Query.isQueryOfType(Query.Types.Function, q)) {
                    return this.onFunction(q)
                } else if(Query.isQueryOfType(Query.Types.FullText, q)) {
                    return this.onFullText(q)
                } else if(Query.isQueryOfType(Query.Types.Property, q)) {
                    return this.onProperty(q)
                } else {
                    throw new Error(`Invalid state.`)
                }
            }

            onInfix(q: Query.Query<Query.Types.Infix, Query.OptBase>, withBrackets: boolean = true): string {
                let left: string
                if(Query.isQueryOfType(Query.Types.Infix, q.options.left)) {
                    left = this.onInfix(q.options.left, false)
                } else {
                    left = this.onAny(q.options.left)
                }

                const op = q.options.type
                const right = this.onAny(q.options.right)

                let result = `${left} -${op} ${right}`
                if(withBrackets) {
                    result = `(${result})`
                }
                return result
            }

            onFunction(q: Query.Query<Query.Types.Function, Query.OptBase>): string {
                const children = Object.entries(q.options.parameters).map(([k, v]) => v ? `${this.onValue(k)}=${this.onValue(v)}` : "")
                return `${Tokenize.AcceptedSymbols.FuncPrefix}${this.onValue(q.options.name)}(${children.join(" ")})`
            }
            
            onAggregate(q: Query.Query<Query.Types.Aggregate, Query.OptBase>): string {
                const children = q.options.children.map(it => this.onAny(it))
                return `${Tokenize.AcceptedSymbols.AggPrefix}${this.onValue(q.options.type)}(${children.join(" ")})`
            }

            onFullText(q: Query.Query<Query.Types.FullText, Query.OptBase>): string {
                return this.onValue(q.options.term)
            }

            onProperty(q: Query.Query<Query.Types.Property, Query.OptBase>): string {
                return `${q.options.property}=${this.onValue(q.options.value)}`
            }

            onValue(s: string): string {
                if(s.includes(" ")) {
                    s = replaceAll(s, '"', '\\"')
                    return `"${s}"`
                } else {
                    return s
                }
            }
        }
    }

    export class SyntaxError extends Error {}

    function replaceAll(s: string, f: string, t: string): string {
        return s.split(f).join(t)
    }
}