const wm = new Map();
let obj = { a: 1 };
wm.set(obj, "1123");
console.log(obj);
setTimeout(() => {
  obj = null;
  console.log(wm.get(obj));
}, 2000);

// container.insertBefore(child2, child1);
