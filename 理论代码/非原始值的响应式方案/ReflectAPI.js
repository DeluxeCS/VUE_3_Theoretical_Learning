/**
 * Reflect提供对对象的默认操作行为
 * ^创建代理对象时指定的拦截函数，实际上是用来自定义代理对象本身的内部方法和行为的，而不是用来指定被代理对象的内部方法和行为的
 */

// 副作用函数的存储与读取
const bucket = new WeakMap();
var activeEffect = null;
// 副作用函数堆栈
var effectStack = [];

// 声明原始值
const obj = {
  foo: 1,
  bar: 111,
};

const ITERATE_KEY = Symbol();
/**
 * 注册副作用函数
 * @param {*} func 副作用函数
 * @param {*} options 调度器
 * @returns
 */
function effect(func, options = {}) {
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
  // ^挂在options到effectFn上
  effectFn.options = options;
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
const p = new Proxy(obj, {
  // ownKeys
  ownKeys(target) {
    // 将副作用函数与key:ITERATE_KEY挂钩,关联
    track(target, ITERATE_KEY);
    return Reflect.ownKeys(target);
  },
  // for...in
  has(target, key) {
    return Reflect.has(target, key);
  },
  // delete
  deleteProperty(target, key) {
    const hasKey = Object.prototype.hasOwnProperty.call(target, key);
    const res = Reflect.deleteProperty(target, key);
    if (hasKey && res) {
      trigger(target, key, "DELETE");
    }
    return res;
  },
  get(target, key, receiver) {
    track(target, key);
    return Reflect.get(target, key, receiver);
  },
  set(target, key, newVal, receiver) {
    debugger;
    // 判断target是否存在属性值为key有则修改无则添加
    const type = Object.prototype.hasOwnProperty.call(target, key) ? "SET" : "ADD";
    // 返回true、false
    const res = Reflect.set(target, key, newVal, receiver);
    trigger(target, key, type);
    return res;
  },
});
/**
 *
 * @param {*} target
 * @param {*} key
 * @returns
 */
function track(target, key) {
  if (!activeEffect) return target[key]; // 无方法时，直接返回结果.
  let depsMap = bucket.get(target); // 获取目标对象
  if (!depsMap) bucket.set(target, (depsMap = new Map())); // 如果不存在，则创建目标对象
  let deps = depsMap.get(key);
  if (!deps) depsMap.set(key, (deps = new Set())); // 如果不存在，则创建目标key
  deps.add(activeEffect);
  activeEffect.deps.push(deps);
}
/**
 *
 * @param {*} target
 * @param {*} key
 * @param {*} type ADD、SET
 * @returns
 */
function trigger(target, key, type) {
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
  if (type === "ADD" && type == "DELETE") {
    // 取与ITERATE_KEY相关副作用函数
    const iterateEffects = depsMap.get(ITERATE_KEY);
    // 将与 ITERATE_KEY 相关联的副作用函数也添加到 effectsToRun
    iterateEffects &&
      iterateEffects.forEach(func => {
        if (activeEffect !== func) {
          effectsRun.add(func);
        }
      });
  }

  effectsRun &&
    effectsRun.forEach(effectFn => {
      if (effectFn.options.scheduler) {
        effectFn.options.scheduler();
      } else {
        effectFn();
      }
    });
}

effect(() => {
  for (const key in p) {
    console.log(p[key]);
  }
});
delete p.bar;
