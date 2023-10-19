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
const data = { foo: 1, bar: 2 };
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
// 触发依赖
function trigger(target, key) {
  let depsMap = bucket.get(target);
  if (!depsMap) return;
  let effects = depsMap.get(key);
  const effectsToRun = new Set();

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

// 计算属性computed
function computed(getter) {
  let value; // 缓存计算结果
  let dirty = true;

  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      if (!dirty) {
        dirty = true;
        trigger(obj, "value");
      }
    },
  });
  // lazy下手动执行
  const obj = {
    get value() {
      if (dirty) {
        value = effectFn();
        dirty = false;
      }
      track(obj, "value");
      return value;
    },
  };
  return obj;
}
let sum = computed(() => obj.foo + obj.bar);

// 监听属性 watch
function watch(source, cb) {
  let getter;
  if (typeof source === "function") {
    getter = source;
  } else {
    getter = () => traverse(source);
  }
  let oldValue, newValue;
  const effectFn = effect(() => getter(), {
    lazy: true,
    scheduler() {
      newValue = effectFn();
      cb(newValue, oldValue);
      oldValue = newValue;
    },
  });
  oldValue = effectFn();
}
function traverse(value, seen = new Set()) {
  if (typeof value !== "object" || value === null || seen.has(value)) return;
  // 将数据添加到 seen 中，代表遍历地读取过了，避免循环引用引起的死循环
  seen.add(value);
  // 暂时不考虑数组等其他结构
  for (const k in value) {
    traverse(value[k], seen);
  }
  return value;
}

watch(
  () => obj.foo,
  (newValue, oldValue) => {
    console.log(newValue, oldValue);
  }
);

obj.foo++;
