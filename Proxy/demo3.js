/**
 * 进步原因
 * ^1、不固定副作用函数名称也可以用匿名函数代替的场景下
 * ^2、读取代理对象上不存在的元素，仍然会运行get、set方法（通过1对1锁定【操作对象和副作用函数】之间的关系）
 */

// 副作用函数的存储与读取
const bucket = new WeakMap();

// 声明原始值
const data = {
  text: "基操勿六",
};

// 创建一个全局变量=>存储被注册的副作用函数
var activeEffect = null;

// 副作用函数=>注册副作用函数
function effect(func) {
  activeEffect = func;
  func();
}

// 代理对象
const obj = new Proxy(data, {
  get(target, key) {
    track(target, key);
    return target[key];
  },
  set(target, key, newVal) {
    target[key] = newVal;
    trigger(target, key);
  },
});
// 函数封装
function track(target, key) {
  console.log("get", target, key);
  if (!activeEffect) return target[key]; // 无方法时，直接返回结果.
  let depsMap = bucket.get(target); // 获取目标对象
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map())); // 如果不存在，则创建目标对象
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set())); // 如果不存在，则创建目标key
  }
  deps.add(activeEffect);
}
function trigger(target, key) {
  console.log("set", target, key);
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  deps && deps.forEach(func => func());
}

// 执行副作用函数注册方法
effect(() => {
  console.log("副作用函数执行啦");
  document.body.innerText = obj.text;
});

setTimeout(() => {
  obj.notExist = "2";
}, 2000);
