enum EASTNodeType {
    None,
    Number,
    Var,
    Operate,
    Function,
}

/** 公式中的变量 */
export class ASTVar {
    private name: string;
    get Name(): string { return this.name; }

    private val: number = 0;
    get Value(): number { return this.val; }

    private bSet = false;
    get HasValue(): boolean { return this.bSet; }

    constructor(name: string) {
        this.name = name;
    }

    SetValue(val: number) {
        this.val = val;
        this.bSet = true;
    }
}

/** 操作结果 */
export class OpResult {
    success: boolean = true;
    msg: string = "";
    ctxPt: number;

    constructor(val: boolean, msg: string, ctxPt: number) {
        this.success = val;
        this.msg = msg;
        this.ctxPt = ctxPt;
    }
}

interface IASTNode {
    CtxPt: number;
    GetType(): EASTNodeType;
    Evaluate(): number;
    Check(): OpResult;
    ToString(deepth: number): string;
}

class MathFunction {
    private name: string;
    get Name(): string { return this.name }

    private argsNum: number;
    get ArgsNum(): number { return this.argsNum }

    private evalFunc: (args: Array<number>) => number;

    constructor(name: string, argsNum: number, evalFunc: (args: Array<number>) => number) {
        this.name = name;
        this.argsNum = argsNum;
        this.evalFunc = evalFunc;
    }

    public Call(args: Array<number>): number {
        return this.evalFunc(args);
    }
}

export class Formula {
    private root: IASTNode | null = null;
    private vars = new Array<ASTVar>();
    private funcRegister = new Map<string, MathFunction>();

    /**
     * 注册一个函数实现，初始状态是不支持任何函数的
     * @param name 函数名
     * @param argsNum 参数个数
     * @param evalFunc 函数实现
     */
    RegFunction(name: string, argsNum: number, evalFunc: (args: Array<number>) => number) {
        let func = new MathFunction(name, argsNum, evalFunc);
        this.funcRegister.set(name, func);
    }

    /** 解析一个数学算式 */
    Parse(formula: string): OpResult {
        this.vars.length = 0;
        this.root = null;
        this.Tokenize(formula);
        let ret = this.ParseExpression();
        this.root = ret[0];
        if (!ret[0])
            return ret[1];

        if (ret[1].success) {
            let check = ret[0]?.Check();
            if (!check.success)
                return check;

            if (this.pt != this.tokens.length) {
                return new OpResult(false, `${this.TokenCtx(this.pt)}剩余未解析符号`, this.pt);
            }
        }
        return ret[1];
    }

    /** 获取算式的变量列表 */
    GetVariables(): Array<ASTVar> {
        return [...this.vars];
    }

    /** 设置算式中变量的值 */
    SetVariables(args: Map<string, number>): OpResult {
        if (!args)
            return new OpResult(true, "", -1);
        for (const kv of args) {
            let name = kv[0];
            let val = kv[1];
            let astVar = this.vars.find(n => { return n.Name == name });
            if (!astVar)
                return new OpResult(false, `不存在名为${name}的变量`, -1);
            astVar.SetValue(val);
        }

        for (const astVar of this.vars) {
            if (!astVar.HasValue)
                return new OpResult(false, `变量${astVar.Name}还未赋值`, -1);
        }

        return new OpResult(true, "", -1);
    }

    /** 计算结果 */
    Evaluate(): [number, OpResult] {
        if (this.root) {
            for (const astVar of this.vars) {
                if (!astVar.HasValue)
                    return [0, new OpResult(false, `未对变量${astVar.Name}设值`, -1)];
            }

            let v = this.root.Evaluate();
            return [v, new OpResult(true, "", -1)];
        }

        return [0, new OpResult(false, `未成功解析公式`, -1)];
    }

    /** 输出词法分析的结果 */
    PrintTokens() {
        if (this.tokens.length <= 0) {
            console.log("No tokens");
            return;
        }
        console.log("PrintTokens begin");
        for (const t of this.tokens) {
            console.log(t);
        }
        console.log("PrintTokens end");
    }

    /** 输出变量列表 */
    PrintVars() {
        if (this.vars.length <= 0) {
            console.log("No variables");
            return;
        }
        console.log("PrintVars begin");
        for (const v of this.vars) {
            console.log("name:%s----hasValue:%s----value:%f", v.Name, v.HasValue ? "true" : "false", v.Value);
        }
        console.log("PrintVars end");
    }

    /** 输出节点树 */
    PrintNodeTree() {
        let s = this.root?.ToString(0);
        console.log("PrintNodeTree begin");
        console.log(s);
        console.log("PrintNodeTree end");
    }


    private tokens = new Array<string>();
    private pt = 0;

    private TokenToNext(): boolean {
        this.pt += 1;
        return this.pt < this.tokens.length;
    }

    private TokenCurrent(): string | null {
        if (this.pt >= this.tokens.length)
            return null;
        return this.tokens[this.pt];
    }

    public TokenCtx(idx: number): string {
        let ctx = "";
        let min = Math.max(idx - 10, 0);
        let max = Math.min(idx + 11, this.tokens.length);
        for (let i = min; i < max; i++) {
            let t = this.tokens[i];
            if (i == idx)
                ctx += `‸‸${t}‸‸`;
            else
                ctx += t;
        }
        if (idx >= this.tokens.length) {
            for (let i = this.tokens.length; i <= idx; i++) {
                let t = null;
                if (i == idx)
                    ctx += `‸‸${t}‸‸`;
                else
                    ctx += t;
            }
        }
        return ctx;
    }

    private Tokenize(formula: string) {
        this.tokens.length = 0;
        this.pt = 0;
        let curr = "";
        for (let i = 0; i < formula.length; i++) {
            let c = formula[i];
            if (c == " ")
                continue;
            if (this.IsTokenSequence(curr, c))
                curr += c;
            else {
                this.tokens.push(curr);
                curr = c;
            }
        }
        if (curr != "")
            this.tokens.push(curr);
    }

    private IsTokenSequence(curr: string, c: string): boolean {
        if (curr == "")
            return true;
        if (curr == "+" || curr == "-" || curr == "*" || curr == "/" || curr == "(" || curr == ")" || curr == ",")
            return false;
        if (c == "+" || c == "-" || c == "*" || c == "/" || c == "(" || c == ")" || curr == ",")
            return false;
        let tryNum = Number.parseFloat(curr);
        if (!Number.isNaN(tryNum)) {
            let tryNumChr = Number.parseInt(c);
            if (Number.isInteger(tryNum)) {
                if (c == ".")
                    return true;
                else if (!Number.isNaN(tryNumChr))
                    return true;
                else
                    return false;
            }
            else {
                return !Number.isNaN(tryNumChr);
            }
        }
        else {
            return true;
        }
    }

    private ParseExpression(): [IASTNode | null, OpResult] {
        let term0 = this.ParseTerm();
        if (term0[0] == null)
            return term0;

        let op = this.TokenCurrent();
        if (op == null)
            return term0;

        let node: IASTNode = term0[0];
        while (op == "+" || op == "-") {// 运算符左结合处理
            let opIdx = this.pt;
            this.TokenToNext();
            let term = this.ParseTerm();
            if (term[0] == null)
                return term;

            node = new OperateNode(node, term[0], op);
            node.CtxPt = opIdx;
            op = this.TokenCurrent();
        }

        let t = this.TokenCurrent();
        if (t != null && t != ")" && t != ",")
            return [null, new OpResult(false, `${this.TokenCtx(this.pt)}表达式中意外的符号`, this.pt)];
        else
            return [node, new OpResult(true, "", -1)];
    }

    private ParseTerm(): [IASTNode | null, OpResult] {
        let factor0 = this.ParseFactor();
        if (factor0[0] == null)
            return factor0;

        let op = this.TokenCurrent();
        if (op == null)
            return factor0;

        let node: IASTNode = factor0[0];
        while (op == "*" || op == "/") {// 运算符左结合处理
            let opIdx = this.pt;
            this.TokenToNext();
            let factor = this.ParseFactor();
            if (factor[0] == null)
                return factor;

            node = new OperateNode(node, factor[0], op);
            node.CtxPt = opIdx;
            op = this.TokenCurrent();
        }

        let t = this.TokenCurrent();
        if (t != null && t != ")" && t != "," && t != "+" && t != "-")
            return [null, new OpResult(false, `${this.TokenCtx(this.pt)}项中意外的符号`, this.pt)];
        else
            return [node, new OpResult(true, "", -1)];
    }

    private ParseFactor(): [IASTNode | null, OpResult] {
        let t = this.TokenCurrent();
        if (t == null)
            return [null, new OpResult(false, `${this.TokenCtx(this.pt)}意外的结束`, this.pt)];
        if (t == "," || t == "*" || t == "/" || t == ")")
            return [null, new OpResult(false, `${this.TokenCtx(this.pt)}因子中意外的符号`, this.pt)];
        if (t == "+" || t == "-")
            return [new NumberNode(0), new OpResult(true, "implicit zero", -1)];

        let tryNum = Number.parseFloat(t);
        if (!Number.isNaN(tryNum)) {
            this.TokenToNext();
            return [new NumberNode(tryNum), new OpResult(true, "", -1)];
        }
        else {
            let tryFuncName = t;
            let hasFunc = this.funcRegister.has(tryFuncName);
            if (hasFunc)
                return this.ParseFunction();
            else {
                if (t == "(") {
                    this.TokenToNext();
                    let exp = this.ParseExpression();
                    let t2 = this.TokenCurrent();
                    if (t2 != ")")
                        return [null, new OpResult(false, `${this.TokenCtx(this.pt)}处期望')'以结束括号`, this.pt)];
                    this.TokenToNext();
                    return exp;
                } else {
                    this.TokenToNext();
                    let astVar: ASTVar | undefined = undefined;
                    astVar = this.vars.find(v => { return v.Name == t });
                    if (!astVar) {
                        astVar = new ASTVar(t);
                        this.vars.push(astVar);
                    }
                    return [new VarNode(astVar), new OpResult(true, "", -1)];
                }
            }
        }
    }

    private ParseFunction(): [IASTNode | null, OpResult] {
        let funcName = this.TokenCurrent();
        if (funcName == null)
            return [null, new OpResult(false, "eof", this.pt)];

        let func = this.funcRegister.get(funcName);
        if (!func)
            return [null, new OpResult(false, `${this.TokenCtx(this.pt)} 不支持的函数${funcName}')'`, this.pt)];

        this.TokenToNext();
        if (this.TokenCurrent() != "(")
            return [null, new OpResult(false, `${this.TokenCtx(this.pt)}处期望'('`, this.pt)];
        this.TokenToNext();
        let args = new Array<IASTNode>();
        while (true) {
            let arg = this.ParseExpression();
            if (arg[0] == null) {
                if (arg[1].success) {
                    if (this.TokenCurrent() != ")")
                        return [null, new OpResult(false, `${this.TokenCtx(this.pt)}处期望')'以结束无参函数`, this.pt)];
                    this.TokenToNext();
                    break;
                }
                else
                    return arg;
            }
            else {
                args.push(arg[0]);
                if (this.TokenCurrent() != ",") {
                    if (this.TokenCurrent() != ")")
                        return [null, new OpResult(false, `${this.TokenCtx(this.pt)}处期望')'以结束函数`, this.pt)];
                    this.TokenToNext();
                    break;
                }
                this.TokenToNext();
            }
        }
        return [new FunctionNode(func, args), new OpResult(true, "", -1)];
    }
}

class NumberNode implements IASTNode {
    CtxPt: number;

    private val: number = 0;
    constructor(val: number) {
        this.val = val;
        this.CtxPt = -1;
    }

    GetType(): EASTNodeType {
        return EASTNodeType.Number;
    }

    Evaluate(): number {
        return this.val;
    }

    Check(): OpResult {
        if (Number.isNaN(this.val))
            return new OpResult(false, `数字为NaN`, this.CtxPt);
        else
            return new OpResult(true, "", this.CtxPt);
    }

    ToString(deepth: number): string {
        let s = "";
        for (let i = 0; i < deepth; i++) {
            s += "  ";
        }
        s += `${EASTNodeType[this.GetType()]} val=${this.val}`;
        return s;
    }
}

class VarNode implements IASTNode {
    CtxPt: number;

    private astVar: ASTVar;

    constructor(astVar: ASTVar) {
        this.astVar = astVar;
        this.CtxPt = -1;
    }

    GetType(): EASTNodeType {
        return EASTNodeType.Var;
    }
    Evaluate(): number {
        return this.astVar.Value;
    }
    Check(): OpResult {
        if (this.astVar == null)
            return new OpResult(false, "未知变量", this.CtxPt);

        return new OpResult(true, "", -1);
    }

    ToString(deepth: number): string {
        let s = "";
        for (let i = 0; i < deepth; i++) {
            s += "  ";
        }
        s += `${EASTNodeType[this.GetType()]} val=${this.astVar.Value}`;
        return s;
    }
}

class OperateNode implements IASTNode {
    CtxPt: number;
    private a: IASTNode | null;
    private b: IASTNode;
    private op: string;

    constructor(a: IASTNode | null, b: IASTNode, op: string) {
        this.a = a;
        this.b = b;
        this.op = op;
        this.CtxPt = -1;
    }

    GetType(): EASTNodeType {
        return EASTNodeType.Operate;
    }

    Evaluate(): number {
        let val0 = this.a?.Evaluate();
        val0 = val0 ?? 0;
        let val1 = this.b?.Evaluate();
        val1 = val1 ?? 0;
        switch (this.op) {
            case "+":
                return val0 + val1;
            case "-":
                return val0 - val1;
            case "*":
                return val0 * val1;
            case "/":
                return val0 / val1;
            default:
                return 0;
        }
    }

    Check(): OpResult {
        if (this.op != "+" && this.op != "-" && this.op != "*" && this.op != "/")
            return new OpResult(false, `不支持的运算符：${this.op}`, this.CtxPt);

        let r0 = this.a?.Check();
        if (r0 && !r0.success)
            return r0;

        let r1 = this.b.Check();
        if (!r1.success)
            return r1;

        return new OpResult(true, "", this.CtxPt);
    }

    ToString(deepth: number): string {
        let s = "";
        for (let i = 0; i < deepth; i++) {
            s += "  ";
        }
        s += `${EASTNodeType[this.GetType()]} op=${this.op}`;
        s += `\n${this.a?.ToString(deepth + 1)}`;
        s += `\n${this.b?.ToString(deepth + 1)}`;
        return s;
    }
}

class FunctionNode implements IASTNode {
    CtxPt: number;
    private func: MathFunction;
    private args: Array<IASTNode>;

    constructor(func: MathFunction, args: Array<IASTNode>) {
        this.func = func;
        this.args = args ?? [];
        this.CtxPt = -1;
    }

    GetType(): EASTNodeType {
        return EASTNodeType.Function;
    }

    Evaluate(): number {
        let funcArgs = new Array<number>();
        for (const arg of this.args) {
            funcArgs.push(arg.Evaluate());
        }
        return this.func.Call(funcArgs);
    }

    Check(): OpResult {
        if (this.args.length != this.func.ArgsNum)
            return new OpResult(false, `函数${this.func.Name}参数数量不符，期望${this.func.ArgsNum}实际${this.args.length}`, this.CtxPt);

        for (const arg of this.args) {
            let ret = arg.Check();
            if (!ret.success)
                return ret;
        }
        return new OpResult(true, "", this.CtxPt);
    }

    ToString(deepth: number): string {
        let s = "";
        for (let i = 0; i < deepth; i++) {
            s += "  ";
        }
        s += `${EASTNodeType[this.GetType()]} name=${this.func.Name}, argsNum=${this.func.ArgsNum}`;
        for (let i = 0; i < this.func.ArgsNum; i++) {
            s += `\n${this.args[i].ToString(deepth + 1)}`;
        }
        return s;
    }
}


// 下面是测试代码
function TestParse(parser: Formula, input: string): OpResult {
    let ret = parser.Parse(input);
    console.log("\n测试解析 %s, 结果:%s", input, ret.success ? "true" : "false");
    if (!ret.success) {
        parser.PrintTokens();
        parser.PrintVars();
        console.log(ret.msg);
    }
    return ret;
}

function TestEval(parser: Formula, args: Map<string, number>, expect: number) {
    let s = parser.SetVariables(args);
    if (!s.success) {
        console.log("%s", s.msg);
        return;
    }

    let pair = parser.Evaluate();
    if (!pair[1].success) {
        console.log("%s", pair[1].msg);
        return;
    }
    if (expect != pair[0]) {
        parser.PrintNodeTree();
    }
    parser.PrintVars();
    console.log("执行结果为%f，期望结果为%f", pair[0], expect);
}

try {
    let test = new Formula();

    TestParse(test, "1+3*(5-2)-");
    TestEval(test, new Map(), 0);

    TestParse(test, "-100-2+x-(y+z)");
    TestEval(test, new Map([["x", 1], ["y", 2.8], ["z", 1.2]]), -100 - 2 + 1 - (2.8 + 1.2));

    TestParse(test, "x+3*(y-2)");
    TestEval(test, new Map([["x", 1], ["y", 2.8]]), 1 + 3 * (2.8 - 2));

    test.RegFunction("ROUND", 1, (args) => {
        return Math.round(args[0]);
    });
    TestParse(test, "ROUND(x+3*(y-2))");
    TestEval(test, new Map([["x", 10], ["y", 1.5]]), Math.round(10 + 3 * (1.5 - 2)));

    TestParse(test, "MAX(1,2)");
    TestEval(test, new Map(), 2);

    TestParse(test, "(1))");
    TestEval(test, new Map(), 0);

    TestParse(test, "1)");
    TestEval(test, new Map(), 0);

    test.RegFunction("LEFT", 2, (args) => {
        return args[0];
    });
    test.RegFunction("RIGHT", 2, (args) => {
        return args[1];
    });
    TestParse(test, "RIGHT(LEFT(1,2), RIGHT(4,3))");
    TestEval(test, new Map(), 3);
} catch (error) {
    console.log(error.msg);
    console.log(error.stack);
}


//tsc --target es2020 .\Formula.ts
