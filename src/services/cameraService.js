let mediaStream = null;

function checkBrowserSupport() {
  const mediaDevices =
    navigator.mediaDevices;

  if (
    !mediaDevices ||
    !mediaDevices.getUserMedia
  ) {
    throw new Error(
      "Camera access is not supported by this browser."
    );
  }
}

function stopCamera() {
  if (!mediaStream) {
    return;
  }

  mediaStream
    .getTracks()
    .forEach((track) => {
      track.stop();
    });

  mediaStream = null;
}

async function startCamera() {
  checkBrowserSupport();

  stopCamera();

  try {
    mediaStream =
      await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",

          width: {
            ideal: 1280,
          },

          height: {
            ideal: 720,
          },
        },

        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

    return mediaStream;

  } catch (error) {
    mediaStream = null;

    if (
      error.name === "NotAllowedError" ||
      error.name === "PermissionDeniedError"
    ) {
      throw new Error(
        "Camera and microphone permission was denied. Allow permission to continue."
      );
    }

    if (
      error.name === "NotFoundError" ||
      error.name === "DevicesNotFoundError"
    ) {
      throw new Error(
        "Camera or microphone was not found on this device."
      );
    }

    if (
      error.name === "NotReadableError" ||
      error.name === "TrackStartError"
    ) {
      throw new Error(
        "Camera or microphone is being used by another application."
      );
    }

    throw new Error(
      "Unable to start the camera and microphone."
    );
  }
}

function getStream() {
  return mediaStream;
}

function attachToVideo(videoElement) {
  if (!videoElement) {
    throw new Error(
      "Video preview element was not found."
    );
  }

  if (!mediaStream) {
    throw new Error(
      "Camera has not been started."
    );
  }

  videoElement.srcObject = mediaStream;

  return videoElement.play();
}

function isCameraActive() {
  if (!mediaStream) {
    return false;
  }

  return mediaStream
    .getVideoTracks()
    .some(
      (track) =>
        track.readyState === "live" &&
        track.enabled
    );
}

function isMicrophoneActive() {
  if (!mediaStream) {
    return false;
  }

  return mediaStream
    .getAudioTracks()
    .some(
      (track) =>
        track.readyState === "live" &&
        track.enabled
    );
}

const cameraService = {
  startCamera,
  stopCamera,
  getStream,
  attachToVideo,
  isCameraActive,
  isMicrophoneActive,
};

export default cameraService;