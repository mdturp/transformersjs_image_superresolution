<script setup>
import NavBar from '@/components/NavBar.vue'
import UploadImage from '@/components/UploadImage.vue'
import FooterBar from '@/components/FooterBar.vue'
import ListTitle from '@/components/ListTitle.vue'
import HorizontalLine from '@/components/HorizontalLine.vue'
import Spinner from '@/components/Spinner.vue'

import useImageProcessor from '@/composables/useImageProcessor'
import ProgressBar from '@/components/ProgressBar.vue'
import { MAX_SELCTION_SIZE } from '@/composables/useImageProcessor'

import BackgroundWorker from '@/background.worker.js?worker'
import { onMounted, onUnmounted, ref } from 'vue'

const progress = ref(0)

let worker = null
onMounted(() => {
  worker = new BackgroundWorker()
})

onUnmounted(() => {
  worker.terminate()
})

const {
  modelQuality,
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

  if (isProcessing.value) {
    return
  }

  if (hasSuperresolution.value) {
    // Reset the canvas
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }

  isProcessing.value = true

  worker.postMessage({
    payload: {
      imageUrl: selectedImageUrl.value,
      modelQuality: modelQuality.value
    }
  })

  worker.onmessage = function (e) {
    const response = e.data
    if (response.status === 'progress') {
      progress.value = response.progress
      return
    }
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
    }
  }
}
</script>

<template>
  <main class="flex flex-col justify-between h-screen">
    <div class="mt-4 px-10 flex flex-col justify-center items-center w-full">
      <NavBar />
      <ListTitle class="mt-8">Start by uploading an Image! </ListTitle>
      <UploadImage @upload="handleImageUpload" />
      <HorizontalLine v-if="uploadedImageSrc" />
      <ListTitle v-if="uploadedImageSrc">
        {{ `Select an area to upscale (max ${MAX_SELCTION_SIZE}x${MAX_SELCTION_SIZE} px)` }}
      </ListTitle>
      <div
        class="relative"
        @mousedown="startSelection"
        @mousemove="resizeSelection"
        @mouseup="endSelection"
        @touchstart="startSelection"
        @touchmove="resizeSelection"
        @touchend="endSelection"
        v-if="uploadedImageSrc"
      >
        <img
          ref="imageRef"
          :src="uploadedImageSrc"
          alt="Uploaded Image"
          draggable="false"
          class="max-w-[350px] sm:max-w-screen-md"
        />
        <div v-if="selection.show" :style="selectionStyle"></div>
      </div>
      <HorizontalLine v-if="selection.show" />
      <div class="flex flex-col items-center justify-center" v-if="selection.show">
        <ListTitle> Select the image quality! </ListTitle>
        <select
          class="block py-2.5 px-0 text-sm bg-transparent border-0 border-b-2 border-gray-200 appearance-none focus:outline-none focus:ring-0 focus:border-gray-200 peer"
          v-model="modelQuality"
        >
          <option value="low">Fast & Low Quality (2x)</option>
          <option value="high">Slow & High Quality (4x)</option>
        </select>
      </div>
      <HorizontalLine v-if="selection.show" />
      <button
        v-if="selection.show"
        @click="run"
        type="button"
        class="text-white bg-gradient-to-br from-purple-600 to-blue-500 hover:bg-gradient-to-bl focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2"
      >
        Get Superresolution
      </button>
      <ProgressBar :progress="progress" v-if="progress > 0.1 && progress <= 99" />
      <HorizontalLine v-if="hasSuperresolution" />
      <ListTitle v-if="hasSuperresolution">Here is your Superresolution!</ListTitle>
      <div class="mt-4" v-if="isProcessing" role="status">
        <Spinner />
      </div>
      <canvas class="mt-4" ref="canvasRef"></canvas>
    </div>
    <FooterBar />
  </main>
</template>
