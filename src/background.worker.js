// worker.js

import { pipeline, env } from '@xenova/transformers'

env.allowLocalModels = import.meta.env.VITE_ALLOW_LOCAL_MODELS !== 'false'
env.useBrowserCache = true //import.meta.env.VITE_USE_BROWSER_CACHE !== 'false'

console.log('allowLocalModels', env.allowLocalModels)
console.log('useBrowserCache', env.useBrowserCache)


class SuperResolutionPipeline {
  static task = 'image-to-image'
  static instance = null
  static model_quality = null

  static async getInstance(modelQuality, progress_callback = null) {
    let model = ''
    if (modelQuality == 'low') {
      console.log('Using low quality model')
      model = 'Xenova/swin2SR-lightweight-x2-64'
    } else {
      console.log('Using high quality model')
      model = 'Xenova/swin2SR-realworld-sr-x4-64-bsrgan-psnr'
    }
    if (this.instance === null || this.model_quality !== modelQuality) {
      this.model_quality = modelQuality
      this.instance = pipeline(this.task, model, { progress_callback })
    }

    return this.instance
  }
}

self.addEventListener('message', async (event) => {
  const { payload } = event.data

  try {
    // Assuming payload contains the image URL
    const imageUrl = payload.imageUrl

    let upscaler = await SuperResolutionPipeline.getInstance(payload.modelQuality, (x) => {
      self.postMessage(x)
    })

    let start = new Date().getTime()
    let result = await upscaler(imageUrl)
    let end = new Date().getTime()

    console.log(`Took ${end - start}ms to run the model`)
    console.log(result)

    // Send the processed image data back to the main thread
    self.postMessage({
      status: 'complete',
      result: result
    })
  } catch (error) {
    // Handle any errors that occur during processing
    self.postMessage({
      status: 'error',
      message: error.message
    })
  }
})
