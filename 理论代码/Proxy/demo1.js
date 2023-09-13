// 副作用函数的存储与读取
const bucket = new Set();

// 声明原始值
const data = {
  text: "基操勿六",
};

// 副作用函数
function effect() {
  document.body.innerText = obj.text;
}

// 代理对象
const obj = new Proxy(data, {
  get(target, key) {
    console.log("get");
    bucket.add(effect);
    return target[key];
  },
  set(target, key, newVal) {
    console.log("set");
    target[key] = newVal;
    bucket && bucket.forEach(func => func());
    return true;
  },
});

// 执行函数
effect();
setInterval(() => {
  obj.text += "6";
}, 1000);
