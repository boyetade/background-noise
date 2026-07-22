import "./App.css";
import { useEffect, useRef, useState } from "react";
import Webcam from "react-webcam";
import { Camera } from "./Components/Camera";
import { Star } from "./Components/Star";

function App() {
  const webcamRef = useRef<Webcam>(null);
  const [isWebcamReady, setIsWebcamReady] = useState(false);
  const [recordedFrames, setRecordedFrames] = useState<ImageData[] | null>(
    null,
  );

  useEffect(() => {
    const checkVideoReady = () => {
      const video = webcamRef.current?.video;
      if (video && video.readyState >= video.HAVE_ENOUGH_DATA) {
        setIsWebcamReady(true);
      }
    };

    checkVideoReady();
    const intervalId = window.setInterval(checkVideoReady, 250);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div>
      <h1>Hello World</h1>

      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        screenshotQuality={0.9}
        width={500}
        height={500}
        onUserMedia={() => setIsWebcamReady(true)}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      <Camera
        webcamRef={webcamRef}
        isWebcamReady={isWebcamReady}
        onRecordingStart={() => setRecordedFrames(null)}
        onRecordingComplete={(frames) => setRecordedFrames(frames)}
      />
      <Star recordedFrames={recordedFrames} />
    </div>
  );
}

export default App;
