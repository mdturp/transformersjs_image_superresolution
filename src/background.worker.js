// worker.js

import { pipeline, env } from '@xenova/transformers'

env.allowLocalModels = false

class SuperResolutionPipeline {
  static task = 'image-to-image'
  static model = 'Xenova/swin2SR-classical-sr-x4-64'
  static instance = null

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback })
    }

    return this.instance
  }
}

self.addEventListener('message', async (event) => {
  const { payload } = event.data

  try {
    // Assuming payload contains the image URL
    const imageUrl = payload.imageUrl

    let upscaler = await SuperResolutionPipeline.getInstance((x) => {
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
