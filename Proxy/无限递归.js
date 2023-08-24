/**
 * 进步原因
 * ^嵌套函数问题处理(做一个副作用函数栈，无限嵌套读取抛出)
 */

// 副作用函数的存储与读取
const bucket = new WeakMap();

// 声明原始值
const data = {
  foo: 0,
};

var activeEffect = null;
// 副作用函数堆栈
var effectStack = [];

// 副作用函数=>注册副作用函数
function effect(func) {
  const effectFn = () => {
    cleanup(effectFn); // 清空一次
    activeEffect = effectFn; // 在副作用函数执行前
    effectStack.push(effectFn);
    func();
    effectStack.pop(); // 抛出顶层副函数
    activeEffect = effectStack[effectStack.length - 1]; // 恢复次级副函数=>为全局副作用函数
  };
  // 在副作用函数执行前
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
  if (!depsMap) {
    bucket.set(target, (depsMap = new Map())); // 如果不存在，则创建目标对象
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set())); // 如果不存在，则创建目标key
  }
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
  console.log("副作用函数列表");
  console.dir(activeEffect.deps);
  console.log("当前桶桶对象对应的weakMap");
  console.dir(depsMap);
}
function trigger(target, key) {
  console.log("set", target, key);
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);
  const effectsRun = new Set();
  // !此处做了守卫，判断副作用函数与正在执行副作用函数是否相同
  // ~相同-不做处理。
  effects &&
    effects.forEach(func => {
      if (activeEffect !== func) {
        effectsRun.add(func);
      }
    });
  effectsRun && effectsRun.forEach(func => func());
}

// 执行副作用函数注册方法
effect(() => {
  obj.foo += 1;
});
