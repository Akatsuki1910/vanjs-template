import van from "vanjs-core";
const { p } = van.tags;

const Hello = () => p("👋Hello");

van.add(document.body, Hello());
