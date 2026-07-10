// ============================================================
// OpenCV.js loader — loads OpenCV.js from CDN once, caches it.
// Used by the real document scanner for edge detection +
// perspective correction. No server needed.
// ============================================================

let cvPromise = null;
let cvInstance = null;

const OPENCV_CDN = 'https://docs.opencv.org/4.10.0/opencv.js';

export function loadOpenCV() {
  if (cvInstance) return Promise.resolve(cvInstance);
  if (cvPromise) return cvPromise;

  cvPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('OpenCV can only be loaded in the browser'));
      return;
    }

    // If already loaded by a script tag
    if (window.cv && window.cv.Mat) {
      cvInstance = window.cv;
      resolve(cvInstance);
      return;
    }

    const script = document.createElement('script');
    script.src = OPENCV_CDN;
    script.async = true;
    script.onload = () => {
      // OpenCV.js uses a Module init pattern
      if (window.cv && window.cv.Mat) {
        cvInstance = window.cv;
        resolve(cvInstance);
        return;
      }
      // Some builds need a 'ready' callback
      if (window.cv && typeof window.cv.then === 'function') {
        window.cv.then((cv) => {
          cvInstance = cv;
          resolve(cv);
        });
        return;
      }
      // Poll for cv.Mat to become available
      let tries = 0;
      const poll = setInterval(() => {
        tries++;
        if (window.cv && window.cv.Mat) {
          clearInterval(poll);
          cvInstance = window.cv;
          resolve(cvInstance);
        } else if (tries > 100) {
          clearInterval(poll);
          reject(new Error('OpenCV failed to initialize'));
        }
      }, 100);
    };
    script.onerror = () => reject(new Error('Failed to load OpenCV.js from CDN'));
    document.head.appendChild(script);
  });

  return cvPromise;
}
