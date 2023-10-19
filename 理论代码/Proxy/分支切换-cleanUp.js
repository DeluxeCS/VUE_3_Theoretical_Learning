/**
 * 进步原因
 * ^分支切换-cleanUp
 */

// 副作用函数的存储与读取
const bucket = new WeakMap();

// 声明原始值
const data = {
  text: false,
  notExist: "NoNoNo",
};

// 创建一个全局变量=>存储被注册的副作用函数
var activeEffect = null;

// 副作用函数=>注册副作用函数
function effect(func) {
  const effectFn = () => {
    cleanup(effectFn);
    activeEffect = effectFn; // 在副作用函数执行前，清空一次
    func();
  };
  effectFn.deps = []; // 副作用函数及关联的副作用对象关系链
  effectFn();
}

// 清空关联的副作用方法链
function cleanup(effectFn) {
  for (let index = 0; index < effectFn.deps.length; index++) {
    const element = effectFn.deps[index];
    element.delete(effectFn);
  }
  effectFn.length = 0;
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
  if (!activeEffect) return target[key]; // 无方法时，直接返回结果.
  let depsMap = bucket.get(target); // 获取目标对象
  !depsMap && bucket.set(target, (depsMap = new Map())); // 如果不存在，则创建目标对象
  let deps = depsMap.get(key);
  !deps && depsMap.set(key, (deps = new Set())); // 如果不存在，则创建目标key
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}

function trigger(target, key) {
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);
  const effectsToRun = new Set(effects);
  effectsToRun.forEach(func => func());
}

// 执行副作用函数注册方法
effect(() => {
  document.body.innerText = obj.text ? obj.notExist : "no";
});

setTimeout(() => {
  obj.text = false;
}, 2000);
