// 基础数据类型
const age: number | null = 100;
type NewType = number | null;
let timer: NewType = null;
// 数组类型
let numbers: number[] = [0];
type NS = number | string;
let arrayList: Array<NS> = [0, 1, 2, "1", "2"];
// 函数（函数入参、返回值类型）
// ^定义单个函数
// function 函数名(形参1： 类型=默认值， 形参2：类型=默认值,...): 返回值类型 { }
function setNumber(number1: number, number2: string): number {
  return number1 + Number(number2);
}
const getNumber = (number1: number, number2: string): number => {
  return number1 + Number(number2);
};

//^ 统一定义函数格式
type FN = (n1: number, n2: number) => number;
const add3: FN = (a, b) => {
  return a + b;
};
console.log(add3(1, 2));

// void 无返回值
function noReturn(number1: number, number2: number): void {
  console.log(number1 + number2);
}

// 对象类型-类型别名   接口、类型别名
type Person = {
  name: string;
  age: number;
  desc(): void;
};
let person: Person = {
  name: "小花",
  age: 18,
  desc() {
    console.log("hello");
  },
};

interface Person1 {
  rawLoad: number;
  rawLoadIdle: number;
}
