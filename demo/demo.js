const container = document.getElementById("container");
const old1 = container.children[container.children.length - 1];
const newH1 = container.firstChild;
newH1.textContent = "标题2";
container.insertBefore(newH1, null);
