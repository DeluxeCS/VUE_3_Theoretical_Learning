/**
 * 进步原因-不固定副作用函数名称也可以用匿名函数代替的场景下
 */

// 副作用函数的存储与读取
const bucket = new Set();

// 声明原始值
const data = {
  text: "基操勿六",
};

// 代理对象
const obj = new Proxy(data, {
  get(target, key) {
    console.log("get");
    bucket.add(activeEffect);
    return target[key];
  },
  set(target, key, newVal) {
    console.log("set");
    target[key] = newVal;
    bucket && bucket.forEach(func => func());
    return true;
  },
});

// 创建一个全局变量=>存储被注册的副作用函数
var activeEffect = null;

// 副作用函数=>注册副作用函数
function effect(func) {
  activeEffect = func;
  func();
}

// 执行副作用函数注册方法
effect(() => {
  document.body.innerText = obj.text;
});

setInterval(() => {
  obj.text += "2";
}, 1000);
