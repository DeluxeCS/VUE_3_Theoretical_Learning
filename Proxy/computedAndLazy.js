/**
 * 进步原因
 * ^计算属性，数据读取变更计算
 */

// 副作用函数的存储与读取
const bucket = new WeakMap();

// 声明原始值
const data = {
  foo: 1,
  bar: 9,
};

var activeEffect = null;
// 副作用函数堆栈
var effectStack = [];

// ^用户自定义调度器
/**
 * 定义一个任务队列
 */
// const jobQueue = new Set(); // 去重属性！

// const p = Promise.resolve(); // Promise将任务添加到微任务队列

// let isFlushing = false; // 定义当前数据是否在更新中，刷新中

// function flushJob() {
//   if (isFlushing) return;
//   isFlushing = true;
//   // 在微任务队列中刷新
//   p.then(() => {
//     jobQueue.forEach(job => job());
//   }).finally(() => {
//     isFlushing = false; // 当前流程执行完毕
//   });
// }

// 副作用函数=>注册副作用函数
// ^添加流程调度器
function effect(func, options = {}) {
  const effectFn = () => {
    cleanup(effectFn); // 清空一次
    activeEffect = effectFn; // 在副作用函数执行前
    effectStack.push(effectFn);
    const result = func();
    effectStack.pop(); // 先执行，再抛出顶层副函数
    activeEffect = effectStack[effectStack.length - 1]; // 恢复次级副函数=>为全局副作用函数
    return result;
  };
  effectFn.deps = []; // 副作用函数及关联的副作用对象关系链
  // ^挂在options到effectFn上
  effectFn.options = options;
  if (!options.lazy) effectFn();
  return effectFn; // 副作用函数作为参数return
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
  console.log("get", target, key);
  if (!activeEffect) return target[key]; // 无方法时，直接返回结果.
  let depsMap = bucket.get(target); // 获取目标对象
  if (!depsMap) bucket.set(target, (depsMap = new Map())); // 如果不存在，则创建目标对象
  let deps = depsMap.get(key);
  if (!deps) depsMap.set(key, (deps = new Set())); // 如果不存在，则创建目标key
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}
function trigger(target, key) {
  console.log("set", target, key);
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  const effects = depsMap.get(key);
  const effectsRun = new Set();
  // 此处做了守卫，判断副作用函数与正在执行副作用函数是否相同
  // 相同-不做处理。
  effects &&
    effects.forEach(func => {
      if (activeEffect !== func) {
        effectsRun.add(func);
      }
    });
  effectsRun &&
    effectsRun.forEach(effectFn => {
      if (effectFn.options.scheduler) {
        effectFn.options.scheduler();
      } else {
        effectFn();
      }
    });
}

/**
 * ^计算属性
 * @param {*} getter // getter作为副作用函数
 * @returns obj
 */
function computed(getter) {
  // ^实现多次访问，计算一次的数据存储
  let value = null;
  let dirty = true; // 标志是否需要重新计算
  const effectFn = effect(getter, {
    scheduler() {
      dirty = true;
      trigger(obj, "value");
    },
    lazy: true,
  });
  const obj = {
    get value() {
      if (dirty) {
        value = effectFn();
        dirty = false;
        track(obj, "value");
      }
      //! track(obj, "value"); 存在无限读取问题
      return value;
    },
  };
  return obj;
}

// 执行副作用函数注册方法

// 计算属性获取value
const sumRes = computed(() => obj.foo + obj.bar); // 手动控制执行
effect(() => console.log(sumRes.value));

obj.foo += 1;
console.log(obj.bar);
