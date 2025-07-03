# 公式解析
支持加减乘除和函数的混合运算  

## TypeScript实现
测试截图  
![image](/img/ts_test.png)  

### 使用方法：  
```ts
// 创建一个公式对象
let parser = new Formula();
// 注册需要的函数，可多次注册
parser.RegFunction("ROUND", 1, (args) => {
    return Math.round(args[0]);
});
// 解析公式字符串
parser.Parse("ROUND(x+3*(y-2))");
// 可多次执行下面的步骤，每次传入不同的变量的值
// 设置变量的值（如果有的话）
parser.SetVariables(new Map([["x", 1], ["y", 2.8]]));
// 计算值
let pair = parser.Evaluate();
// 打印结果
console.log("执行结果为%f", pair[0]);
```
