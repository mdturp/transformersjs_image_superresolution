import { ref, reactive, computed } from 'vue'

export const MAX_SELCTION_SIZE = 200

export default function useImageProcessor() {
  const modelQuality = ref('low')
  const canvasRef = ref(null)
  const imageRef = ref(null)
  const isProcessing = ref(false)
  const uploadedImageSrc = ref('')
  const hasSuperresolution = ref(false)
  const selecting = ref(false)
  const selectedImageUrl = ref('')
  const selection = reactive({
    show: false,
    startX: 0,
    startY: 0,
    width: 0,
    height: 0
  })

  const reset = () => {
    // Clear the canvas
    if (!canvasRef.value) {
      const canvas = canvasRef.value
      const context = canvas.getContext('2d')
      context.clearRect(0, 0, canvas.width, canvas.height)
    }

    uploadedImageSrc.value = ''
    hasSuperresolution.value = false
    selectedImageUrl.value = ''
    selection.show = false
    selection.startX = 0
    selection.startY = 0
    selection.width = 0
    selection.height = 0
  }

  const selectionStyle = computed(() => ({
    position: 'absolute',
    top: `${selection.startY}px`,
    left: `${selection.startX}px`,
    width: `${selection.width}px`,
    height: `${selection.height}px`,
    border: '2px solid blue',
    pointerEvents: 'none'
  }))

  const getEventCoordinates = (event) => {
    if (event.touches) {
      // Touch event

      const touch = event.touches[0]
      const rect = touch.target.getBoundingClientRect()
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      }
    } else {
      // Mouse event
      return {
        x: event.offsetX,
        y: event.offsetY
      }
    }
  }

  const startSelection = (event) => {
    if (event.touches) event.preventDefault() // Prevent scrolling on touch devices
    if (isProcessing.value) return
    const { x, y } = getEventCoordinates(event)
    selecting.value = true
    selection.show = true
    selection.width = 0
    selection.height = 0
    selection.startX = x
    selection.startY = y
  }

  const resizeSelection = (event) => {
    if (isProcessing.value) return
    if (event.touches) event.preventDefault()
    const image = imageRef.value
    if (!image) return
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height
    if (selecting.value) {
      const { x, y } = getEventCoordinates(event)
      selection.width = Math.min(x - selection.startX, MAX_SELCTION_SIZE/scaleX)
      selection.height = Math.min(y - selection.startY, MAX_SELCTION_SIZE/scaleY)
    }
  }

  const endSelection = () => {
    if (isProcessing.value) return
    selecting.value = false
  }

  return {
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
  }
}
