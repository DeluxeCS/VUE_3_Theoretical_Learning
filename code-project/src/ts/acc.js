// 基础数据类型
var age = 100;
var timer = null;
// 数组类型
var numbers = [0];
var arrayList = [0, 1, 2, "1", "2"];
// 函数（函数入参、返回值类型）
// ^定义单个函数
// function 函数名(形参1： 类型=默认值， 形参2：类型=默认值,...): 返回值类型 { }
function setNumber(number1, number2) {
    return number1 + Number(number2);
}
var getNumber = function (number1, number2) {
    return number1 + Number(number2);
};
var add3 = function (a, b) {
    return a + b;
};
console.log(add3(1, 2));
