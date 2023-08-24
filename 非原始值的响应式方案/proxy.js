// proxy代理
const obj = { foo: 1 };
// const handler = {
//   get(target, key, context) {
//     console.log("no---", key, context);
//     return Reflect.get(target, key, context);
//   },
// };

/**
 * 将代理作为无子元素error信息拦截
 */
// const handler = {
//   get(target, key, context) {
//     if (Reflect.has(target, key)) {
//       return Reflect.get(target, key, context);
//     } else {
//       throw `该对象无此元素${key}`;
//     }
//   },
//   set(target, key, val, context) {
//     if (Reflect.has(target, key)) {
//       return Reflect.set(target, key, val, context);
//     } else {
//       throw `该对象无此元素${key}`;
//     }
//   },
// };
// const proxyObj = new Proxy(obj, handler);
// console.log(proxyObj.foo);
// proxyObj.foo = 1;
/**
 * !将代理作为对象的父级原型
 */
//将代理转为主对象的[[prototype]]中
// const handlers = {
//   get(target, key, context) {
//     throw `该对象无此元素${key}`;
//   },
//   set(target, key, context) {
//     throw `该对象无此元素${key}`;
//   },
// };
// 声明代理对象拦截功能，扮演greeter的原型
// const catchall = new Proxy({}, handlers);
// const greeter = {
//   speak(who = "NoNoNo") {
//     console.log("hello", who);
//   },
// };
// 设定greeter回退到catchall,将catchall作为greeter的原型
// Object.setPrototypeOf(greeter, catchall);
// greeter.speak("999");
// greeter.hello(); // & greeter无hello方法，故从父级原型catchall中查询

const handlers = {
  get(target, key, context) {
    if (Reflect.has(target, key)) {
      return Reflect.get(target, key, context);
    } else {
      //^ 伪环状[[Prototype]]
      return Reflect.get(target[Symbol.for("[[prototype]]")], key, context);
    }
  },
};

const ProxyObj1 = new Proxy(
  {
    a: "obj1",
    foo() {
      console.log("a:", this.a);
    },
  },
  handlers
);
// ^代码理解为将代理作为空对象的原型
// 再将空对象拼接，返回新的Obj2，其原型为代理对象
const Obj2 = Object.assign(Object.create(ProxyObj1), {
  a: "obj2",
  bar() {
    console.log("a:", this.a);
  },
});

console.dir(Obj2);
// Obj2作为代理对象的Symbol属性的子节点
ProxyObj1[Symbol.for("[[prototype]]")] = Obj2;
console.dir(ProxyObj1);
ProxyObj1.bar();
Obj2.foo();