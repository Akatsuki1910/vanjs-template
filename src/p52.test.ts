let t = 0;
let w = 400;

function setup() {
  createCanvas(w, w, WEBGL);
}

function draw() {
  t++;
  if (t % 5 == 0) {
    const o = w / 4;
    background(o);
    noFill();
    for (let i = 0; i < 6; ) {
      const s = (k) => cos((PI / 3) * k) * o;
      const v = (k) => sin((PI / 3) * k) * o;
      const r = (_) => random(10) - 5;
      const c = s(i);
      const d = v(i);
      i++;
      const e = s(i);
      const f = v(i);
      const g = (h) => [c + (e - c) * h + r(), d + (f - d) * h + r()];
      // @ts-ignore
      bezier(c + r(), d + r(), ...g(0.3), ...g(0.6), e + r(), f + r());
    }
  }
}

window.addEventListener("message", async (event) => {
  if (event.data?.type === "saveGif") {
    console.log("saveGif");
    const canvasStream = document.querySelector("canvas").captureStream(10);
    const options = {
      mimeType: "video/webm;codecs=vp9",
    };
    const mediaRecorder = new MediaRecorder(canvasStream, options);

    function blobToBase64(blob) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    async function handleDataAvailable(event) {
      console.log("data-available");
      if (event.data.size > 0) {
        console.log(event.data);
        const base64 = await blobToBase64(event.data);
        window.parent.postMessage(
          JSON.stringify({
            type: "webmData",
            data: base64,
          }),
          "*"
        );
        console.log("send message");
      } else {
        console.log("no data");
      }
    }

    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();
    setTimeout(() => {
      console.log("stopping");
      mediaRecorder.stop();
    }, 10000);
  }
});
