<!-- src/components/utils/AnimatedNumber.vue -->
<template>
  <span>{{ displayValue }}</span>
</template>

<script setup>
import { ref, watch, onMounted, toRefs } from 'vue';
import { gsap } from 'gsap';

const props = defineProps({
  value: { type: Number, required: true },
  formatter: { type: Function, default: (val) => val.toString() }, // Default formatter
  duration: { type: Number, default: 0.8 }
});

const { value: propValue, formatter: propFormatter, duration: propDuration } = toRefs(props);

const displayValue = ref(propFormatter.value(0)); // Initialize with formatted 0
const tweenedValue = ref(0); // Internal value for GSAP to tween, starts at 0

watch(propValue, (newValue) => {
  // Animate from the current tweenedValue to the new propValue
  gsap.to(tweenedValue, {
    duration: propDuration.value,
    value: newValue,
    ease: 'power2.out',
    onUpdate: () => {
      displayValue.value = propFormatter.value(Math.round(tweenedValue.value));
    }
  });
}, { immediate: false }); // `immediate: false` because onMounted handles the initial animation

onMounted(() => {
  // Animate from 0 (current tweenedValue) to the initial propValue.value on mount
  gsap.to(tweenedValue, {
      duration: propDuration.value,
      value: propValue.value, // Target the initial prop value
      ease: 'power2.out',
      onUpdate: () => {
          displayValue.value = propFormatter.value(Math.round(tweenedValue.value));
      },
      onComplete: () => {
          // Ensure the final display is exactly the formatted prop value, especially if animation was quick or target was 0
          displayValue.value = propFormatter.value(Math.round(propValue.value));
      }
  });
});
</script>

<style scoped>
span {
  display: inline-block;
  min-width: 1em; /* Prevent layout shift for very small numbers */
  text-align: inherit; /* Inherit text-align from parent */
}
</style>