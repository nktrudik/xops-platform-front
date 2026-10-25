<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { useRibbonMotion } from './liquid-ribbon/useRibbonMotion'

const props = defineProps<{ host: HTMLElement | null; engaged: boolean }>()
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const stage = useTemplateRef<HTMLElement>('stage')
const id = useId()
const { ready, paused, reduced, running } = useRibbonMotion(
  canvas,
  stage,
  () => props.host,
  () => props.engaged,
)
</script>

<template>
  <div
    class="liquid-ribbon"
    :class="{ 'is-still': !running, 'is-engaged': engaged }"
    :data-renderer="ready && !reduced ? 'webgl' : 'static'"
  >
    <div class="color-field field-rose" aria-hidden="true" />
    <div class="color-field field-lilac" aria-hidden="true" />
    <div class="color-field field-blue" aria-hidden="true" />
    <div ref="stage" class="ribbon-stage" aria-hidden="true">
      <div class="ribbon-shadow" />
      <svg v-show="!ready || reduced" class="ribbon-fallback" viewBox="0 0 500 340" fill="none">
        <defs>
          <linearGradient
            :id="`${id}-red`"
            x1="160"
            y1="45"
            x2="360"
            y2="295"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="#FF7E8D" />
            <stop offset=".19" stop-color="#E30611" />
            <stop offset=".48" stop-color="#A60522" />
            <stop offset=".58" stop-color="#FFCCD5" />
            <stop offset=".7" stop-color="#E30611" />
            <stop offset="1" stop-color="#9B0823" />
          </linearGradient>
          <linearGradient
            :id="`${id}-shine`"
            x1="155"
            y1="110"
            x2="345"
            y2="215"
            gradientUnits="userSpaceOnUse"
          >
            <stop stop-color="#FFBBC8" />
            <stop offset=".35" stop-color="#E30611" />
            <stop offset=".65" stop-color="#B40022" />
            <stop offset="1" stop-color="#FF899F" />
          </linearGradient>
        </defs>
        <g transform="rotate(-20 250 170)">
          <path
            d="M250 170C185 71 110 60 102 127C93 195 176 235 250 170C324 105 407 145 398 213C390 280 315 269 250 170Z"
            :stroke="`url(#${id}-red)`"
            stroke-width="46"
          />
          <path
            d="M110 104C130 71 193 98 250 170C307 242 370 269 390 236"
            :stroke="`url(#${id}-shine)`"
            stroke-width="39"
          />
          <path
            d="M111 103C135 85 187 106 247 178M284 202C337 252 371 257 389 236"
            stroke="white"
            stroke-opacity=".55"
            stroke-width="2"
            stroke-linecap="round"
          />
        </g>
      </svg>
      <canvas v-show="ready && !reduced" ref="canvas" class="ribbon-canvas" />
    </div>
    <div class="ribbon-scrim" aria-hidden="true" />
    <button
      v-if="!reduced"
      class="motion-toggle"
      type="button"
      :aria-label="paused ? 'Включить анимацию' : 'Приостановить анимацию'"
      :aria-pressed="paused"
      @click="paused = !paused"
    >
      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden="true">
        <path v-if="paused" d="M5 3.5 12 8l-7 4.5z" />
        <path v-else d="M4 3h3v10H4zm5 0h3v10H9z" />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.liquid-ribbon {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.color-field {
  position: absolute;
  border-radius: 50%;
  filter: blur(42px);
  animation: field-drift 19s ease-in-out infinite alternate;
  will-change: transform;
}
.field-rose {
  width: 420px;
  height: 360px;
  right: -100px;
  top: -110px;
  background: #f7b5c6;
  opacity: 0.52;
  transition: opacity 0.6s;
}
.field-lilac {
  width: 440px;
  height: 280px;
  right: 160px;
  top: 60px;
  background: #c8bcf5;
  opacity: 0.42;
  animation-delay: -7s;
  animation-duration: 23s;
}
.field-blue {
  width: 420px;
  height: 240px;
  right: -90px;
  bottom: -90px;
  background: #b2d9f4;
  opacity: 0.6;
  animation-delay: -13s;
}
.ribbon-stage {
  position: absolute;
  right: 12px;
  top: -4px;
  width: 500px;
  height: 330px;
}
.ribbon-canvas,
.ribbon-fallback {
  position: absolute;
  width: 100%;
  height: 100%;
  inset: 0;
}
.ribbon-shadow {
  position: absolute;
  left: 20%;
  right: 13%;
  bottom: 20px;
  height: 25px;
  background: #9f306d;
  opacity: 0.13;
  filter: blur(16px);
  transform: rotate(-8deg);
}
.ribbon-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #faf6fb 0%, #faf6fbf5 38%, #faf6fb00 72%);
}
.motion-toggle {
  position: absolute;
  right: 20px;
  top: 20px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 1px solid #ffffffb3;
  border-radius: 50%;
  color: #6c5160;
  background: #ffffff8c;
  pointer-events: auto;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition:
    background 0.2s,
    color 0.2s,
    transform 0.2s;
}
.motion-toggle:hover {
  background: white;
  color: var(--red);
  transform: scale(1.06);
}
.motion-toggle::before {
  content: '';
  position: absolute;
  inset: -6px;
  border-radius: 50%;
}
.motion-toggle:active {
  transform: scale(0.94);
}
.is-still .color-field {
  animation-play-state: paused;
}
.is-engaged .field-rose {
  opacity: 0.72;
}
@keyframes field-drift {
  from {
    transform: translate3d(-16px, -8px, 0) scale(0.94);
  }
  to {
    transform: translate3d(32px, 20px, 0) scale(1.12);
  }
}
@media (min-width: 1700px) {
  .ribbon-stage {
    right: 42px;
    width: 580px;
    height: 350px;
    top: -6px;
  }
}
@media (max-width: 1100px) {
  .ribbon-stage {
    right: -70px;
    width: 430px;
    opacity: 0.7;
  }
  .ribbon-scrim {
    background: linear-gradient(90deg, #faf6fb 0%, #faf6fbf5 48%, #faf6fb26 100%);
  }
}
@media (max-width: 640px) {
  .ribbon-stage {
    width: 270px;
    height: 230px;
    top: -24px;
    right: -100px;
    opacity: 0.6;
  }
  .ribbon-scrim {
    background: linear-gradient(110deg, #faf6fb 0%, #faf6fbf5 40%, #faf6fb5c 100%);
  }
  .field-rose {
    width: 240px;
    height: 220px;
    right: -140px;
    top: -60px;
  }
  .field-lilac {
    width: 230px;
    right: -80px;
    top: 140px;
  }
  .field-blue {
    width: 300px;
    right: -80px;
  }
  .motion-toggle {
    right: 10px;
    top: 10px;
    width: 28px;
    height: 28px;
  }
  .motion-toggle::before {
    inset: -8px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .color-field {
    animation: none;
    will-change: auto;
  }
}
</style>
