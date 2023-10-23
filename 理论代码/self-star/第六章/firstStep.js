// const bucket = new Set(); // hash存储、去重
// next>>>>> 副作用函数与目标值之间建立联系
const bucket = new WeakMap();
let activeEffect = undefined; // 当前执行副作用函数
// 用于注册副作用函数的函数
const effectStack = []; // 新增
function effect(func, options = {}) {
  const effectFn = () => {
    cleanUp(effectFn);
    activeEffect = effectFn;
    // 规避嵌套组件，数据访问
    effectStack.push(effectFn);
    const res = func();
    effectStack.pop();
    activeEffect = effectStack[effectStack.length - 1];
    return res;
  };
  // 将 options 挂载到 effectFn 上
  effectFn.options = options;
  effectFn.deps = [];
  if (!options.lazy) {
    effectFn();
  }
  return effectFn;
}
// 每次副作用函数执行完毕，删除旧的联系
function cleanUp(effectFn) {
  for (let index = 0; index < effectFn.deps.length; index++) {
    const deps = effectFn.deps[index];
    deps.delete(effectFn);
    effectFn.deps.length = 0;
  }
}
const ITERATE_KEY = Symbol();

function reactive(obj, isShallow = false, isReadonly = false) {
  return new Proxy(obj, {
    get(target, key, receiver) {
      if (key === "raw") return target;
      !isReadonly && track(target, key);
      const res = Reflect.get(target, key, receiver);
      if (isShallow) return res;
      if (typeof res === "object" && res !== null) {
        return reactive(res);
      }
      return res;
    },
    set(target, key, newVal, receiver) {
      if (isReadonly) return;
      const oldVal = target[key];
      const type = Array.isArray(target) ? (Number(key) < target.length ? "SET" : "ADD") : Object.prototype.hasOwnProperty.call(target, key) ? "SET" : "ADD";
      const res = Reflect.set(target, key, newVal, receiver);
      if (target === receiver.raw) newVal !== oldVal && (oldVal === oldVal || newVal === newVal) && trigger(target, key, type, newVal);
      return res;
    },
    deleteProperty(target, key) {
      if (isReadonly) return;
      const hasKey = Object.prototype.hasOwnProperty.call(target, key);
      const res = Reflect.deleteProperty(target, key);
      if (hasKey && res) {
        trigger(target, key, "DELETE");
      }
      return res;
    },
    has(target, key) {
      !isReadonly && track(target, key);
      return Reflect.has(target, key);
    },
    ownKeys(target) {
      !isReadonly && track(target, Array.isArray(target) ? "length" : ITERATE_KEY);
      return Reflect.ownKeys(target, ITERATE_KEY);
    },
  });
}
// 数组的新增修改关联length
let shouldTrack = true;
// 重写数组的 push、pop、shift、unshift 以及 splice 方法
["push", "pop", "shift", "unshift", "splice"].forEach(method => {
  const originMethod = Array.prototype[method];
  arrayInstrumentations[method] = function (...args) {
    shouldTrack = false;
    let res = originMethod.apply(this, args);
    shouldTrack = true;
    return res;
  };
});
// 收集依赖
function track(target, key) {
  if (!activeEffect) return target[key];
  // -------副作用函数与目标值之间建立联系--------
  let depsMap = bucket.get(target);
  !depsMap && bucket.set(target, (depsMap = new Map()));
  let deps = depsMap.get(key);
  !deps && depsMap.set(key, (deps = new Set()));
  deps.add(activeEffect);
  activeEffect.deps.push(deps); // 副作用函数与key的关系
  // --------副作用函数与目标值之间建立联系-------
}
/**
 * 触发依赖
 * @param {object} target 目标对象
 * @param {*} key 主键
 * @param { string } type add/set
 * @param { string } newVal 变更数组长度时的传参
 * @returns
 */
function trigger(target, key, type, newVal) {
  let depsMap = bucket.get(target);
  if (!depsMap) return;
  let effects = depsMap.get(key);
  const effectsToRun = new Set();
  // 如果操作目标是数组，并且修改了数组的 length 属性
  if (Array.isArray(target) && key === "length") {
    // 对于元索引大于或等于新的 length 值的素，
    // 需要把所有相关联的副作用函数取出并添加到 effectsToRun 中待执行
    depsMap.forEach((effects, key) => {
      if (key >= newVal) {
        effects.forEach(effectFn => {
          if (effectFn !== activeEffect) {
            effectsToRun.add(effectFn);
          }
        });
      }
    });
  }
  // length数组
  if (type === "ADD" && Array.isArray(target)) {
    const lengthEffect = depsMap.get("length");
    lengthEffect &&
      lengthEffect.forEach(effectFn => {
        activeEffect !== effectFn && effectsToRun.add(effectFn);
      });
  }
  // for...in对象
  if (type === "ADD" || type === "DELETE") {
    const iterateEffect = depsMap.get(ITERATE_KEY);
    iterateEffect &&
      iterateEffect.forEach(effectFn => {
        activeEffect !== effectFn && effectsToRun.add(effectFn);
      });
  }
  effects &&
    effects.forEach(effectFn => {
      // 规避内存溢出、待执行副作用函数与当前正在执行的副作用函数是否一致
      activeEffect !== effectFn && effectsToRun.add(effectFn);
    });
  effectsToRun.forEach(effectFn => {
    if (effectFn.options.scheduler) {
      effectFn.options.scheduler(effectFn);
    } else {
      effectFn();
    }
  });
}

// 调度执行，需要执行队列
const jobQueue = new Set();
const p = Promise.resolve();
let isFlushing = false;
function flushJob() {
  if (isFlushing) return;
  p.then(() => {
    jobQueue.forEach(func => func());
  }).finally(() => {
    isFlushing = false;
  });
}

const obj = [{ foo: 1 }, 1, 33, 2, 3];
const arr = reactive(obj);
effect(() => {
  document.body.innerHTML = arr.includes(1);
});
setTimeout(() => {
  arr[1] = 2;
}, 2000);

// 计算属性computed
// function computed(getter) {
//   let value; // 缓存计算结果
//   let dirty = true;

//   const effectFn = effect(getter, {
//     lazy: true,
//     scheduler() {
//       if (!dirty) {
//         dirty = true;
//         trigger(obj, "value");
//       }
//     },
//   });
//   // lazy下手动执行
//   const obj = {
//     get value() {
//       if (dirty) {
//         value = effectFn();
//         dirty = false;
//       }
//       track(obj, "value");
//       return value;
//     },
//   };
//   return obj;
// }
// let sum = computed(() => obj.foo + obj.bar);
// 监听属性 watch
// function watch(source, cb) {
//   let getter;
//   if (typeof source === "function") {
//     getter = source;
//   } else {
//     getter = () => traverse(source);
//   }
//   let oldValue, newValue;
//   const effectFn = effect(() => getter(), {
//     lazy: true,
//     scheduler() {
//       newValue = effectFn();
//       cb(newValue, oldValue);
//       oldValue = newValue;
//     },
//   });
//   oldValue = effectFn();
// }
// function traverse(value, seen = new Set()) {
//   if (typeof value !== "object" || value === null || seen.has(value)) return;
//   // 将数据添加到 seen 中，代表遍历地读取过了，避免循环引用引起的死循环
//   seen.add(value);
//   // 暂时不考虑数组等其他结构
//   for (const k in value) {
//     traverse(value[k], seen);
//   }
//   return value;
// }
// watch(
//   () => obj.foo,
//   (newValue, oldValue) => {
//     console.log(newValue, oldValue);
//   }
// );
