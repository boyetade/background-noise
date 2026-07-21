declare module "gifshot" {
  export type GifshotResult = {
    image: string;
    error: boolean;
    errorCode?: string;
    errorMsg?: string;
  };

  export type GifshotOptions = {
    images?: string[];
    gifWidth?: number;
    gifHeight?: number;
    interval?: number;
    frameDuration?: number;
    numWorkers?: number;
    progressCallback?: (progress: number) => void;
  };

  export type GifshotAPI = {
    createGIF: (
      options: GifshotOptions,
      callback: (result: GifshotResult) => void,
    ) => void;
    isSupported: () => boolean;
    isExistingImagesGIFSupported: () => boolean;
  };

  const gifshot: GifshotAPI;
  export default gifshot;
}
