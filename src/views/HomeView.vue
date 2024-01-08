<script setup>
import NavBar from '@/components/NavBar.vue'
import UploadImage from '@/components/UploadImage.vue'
import FooterBar from '@/components/FooterBar.vue'

import useImageProcessor from '@/composables/useImageProcessor'

import BackgroundWorker from '@/background.worker.js?worker'

const {
  canvasRef,
  imageRef,
  isProcessing,
  uploadedImageSrc,
  hasSuperresolution,
  selectedImageUrl,
  selection,
  selectionStyle,
  startSelection,
  resizeSelection,
  endSelection,
  reset
} = useImageProcessor()

async function handleImageUpload(file) {
  reset()
  if (file && file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = async (e) => {
      uploadedImageSrc.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

function captureSelectedArea() {
  const image = imageRef.value
  if (!image) return

  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height

  const rect = {
    x: selection.startX * scaleX,
    y: selection.startY * scaleY,
    width: selection.width * scaleX,
    height: selection.height * scaleY
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = rect.width
  canvas.height = rect.height

  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height)

  // Convert the canvas content to an image URL
  selectedImageUrl.value = canvas.toDataURL()
}

async function run() {
  captureSelectedArea()

  if (!window.Worker) {
    console.error('Web Workers are not supported in this browser.')
    return
  }

  const worker = new BackgroundWorker()
  if (isProcessing.value){
    return 
  }
  isProcessing.value = true

  worker.postMessage({
    payload: {
      imageUrl: selectedImageUrl.value
    }
  })

  worker.onmessage = function (e) {
    const response = e.data
    if (response.status === 'error') {
      console.error(response.message)
      return
    }
    if (response.status === 'complete') {
      isProcessing.value = false
      const result = response.result
      const canvas = canvasRef.value
      const ctx = canvas.getContext('2d')
      canvas.width = result.width
      canvas.height = result.height
      const imageData = ctx.createImageData(result.width, result.height)

      for (let i = 0, j = 0; i < result.data.length; i += 3, j += 4) {
        // Map the RGB values
        imageData.data[j] = result.data[i] // R
        imageData.data[j + 1] = result.data[i + 1] // G
        imageData.data[j + 2] = result.data[i + 2] // B

        // Set the alpha value
        imageData.data[j + 3] = 255 // Full opacity
      }
      hasSuperresolution.value = true
      ctx.putImageData(imageData, 0, 0)
      worker.terminate()
    }
  }
}
</script>

<template>
  <main class="flex flex-col justify-between h-screen">
    <div class="mt-4 px-10 flex flex-col justify-center items-center w-full">
      <NavBar />
      <h1 class="whitespace-nowrap mt-10 mx-4 mb-3 text-lg font-bold text-gray-800">
        Start by uploading an Image!
      </h1>
      <UploadImage @upload="handleImageUpload" />
      <div v-if="uploadedImageSrc" class="w-[3px] h-[40px] my-3 bg-black border-0"></div>
      <h1
        v-if="uploadedImageSrc"
        class="whitespace-nowrap mx-4 mb-3 text-lg font-bold text-gray-800"
      >
        Select an area to upscale!
      </h1>
      <div
        class="relative"
        @mousedown="startSelection"
        @mousemove="resizeSelection"
        @mouseup="endSelection"
        @touchstart="startSelection"
        @touchmove="resizeSelection"
        @touchend="endSelection"
      >
        <img
          ref="imageRef"
          v-if="uploadedImageSrc"
          :src="uploadedImageSrc"
          alt="Uploaded Image"
          draggable="false"
        />
        <div v-if="selection.show" :style="selectionStyle"></div>
      </div>
      <div v-if="selection.show" class="w-[3px] h-[40px] my-3 bg-black border-0"></div>
      <button
        v-if="selection.show"
        @click="run"
        type="button"
        class="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 dark:focus:ring-blue-800 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2"
      >
        Get Superresolution
      </button>
      <div v-if="hasSuperresolution" class="w-[3px] h-[40px] my-3 bg-black border-0"></div>
      <h1
        v-if="hasSuperresolution"
        class="whitespace-nowrap mx-4 mb-3 text-lg font-bold text-gray-800"
      >
        Here's your superresolution!
      </h1>
      <div class="mt-4" v-if="isProcessing" role="status">
        <svg
          aria-hidden="true"
          class="w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
          viewBox="0 0 100 101"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
            fill="currentColor"
          />
          <path
            d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
            fill="currentFill"
          />
        </svg>
        <span class="sr-only">Loading...</span>
      </div>
      <canvas ref="canvasRef"></canvas>
    </div>
    <FooterBar />
  </main>
</template>
