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
    const canvasStream = document.querySelector("canvas").captureStream();
    const options = { mimeType: "video/webm; codecs=vp9" };
    const mediaRecorder = new MediaRecorder(canvasStream, options);

    async function save(d) {
      console.log("save");
      console.log(d);
      const name = "record.webm";
      const outName = "out.mp4";

      // const { fetchFile } = FFmpeg;
      const { fetchFile } = FFmpegUtil;
      const { FFmpeg } = FFmpegWASM;

      const ffmpeg = new FFmpeg();
      await ffmpeg.load();
      if (!ffmpeg.isLoaded()) {
        console.error("ffmpeg not loaded");
        return;
      }
      console.log("ffmpeg loaded");

      ffmpeg.setProgress(({ ratio }) => {
        console.log("progress:", ratio);
      });

      ffmpeg.FS(
        "writeFile",
        name,
        await fetchFile(
          new Blob(d, {
            type: "video/webm",
          })
        )
      );
      await ffmpeg.run("-i", name, "-c", "copy", outName); // <---(2)
      const data = ffmpeg.FS("readFile", outName);
      console.log("data", data);
    }

    function handleDataAvailable(event) {
      console.log("data-available");
      if (event.data.size > 0) {
        save(event.data);
      } else {
        console.log("no data");
      }
    }

    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.start();
    setTimeout((event) => {
      console.log("stopping");
      mediaRecorder.stop();
    }, 1000);
  }
});
