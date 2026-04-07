
document.addEventListener("nav", () => {
  const fnRefs = document.querySelectorAll("a[data-footnote-ref]");
  fnRefs.forEach(ref => {
    let parent = ref.parentElement;
    if (parent.tagName === 'SUP') {
        if (parent.nextElementSibling && parent.nextElementSibling.classList.contains("sidenote")) return;
        const targetId = ref.getAttribute("href").replace("#", "");
        const fnContent = document.getElementById(targetId);
        if (fnContent) {
          const sidenote = document.createElement("span");
          sidenote.className = "sidenote";
          const clone = fnContent.cloneNode(true);
          const backrefs = clone.querySelectorAll("a[data-footnote-backref]");
          backrefs.forEach(b => b.remove());

          const numSpan = document.createElement("span");
          numSpan.className = "sidenote-number";
          numSpan.innerText = ref.innerText;

          if (clone.firstElementChild) {
              clone.firstElementChild.prepend(numSpan);
          } else {
              clone.prepend(numSpan);
          }

          sidenote.innerHTML = clone.innerHTML;
          parent.insertAdjacentElement("afterend", sidenote);

          ref.addEventListener("click", (e) => {
              e.preventDefault();
              sidenote.scrollIntoView({ behavior: "smooth", block: "center" });
              sidenote.style.transition = "background-color 0.5s";
              sidenote.style.backgroundColor = "var(--highlight)";
              setTimeout(() => { sidenote.style.backgroundColor = "transparent"; }, 2000);
          });
        }
    }
  });
});
