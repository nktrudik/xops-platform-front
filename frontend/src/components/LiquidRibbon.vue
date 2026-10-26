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
      v-if="!reduced && ready"
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
  width: 350px;
  height: 300px;
  right: -50px;
  top: -100px;
  background: #ef9caf;
  opacity: 0.65;
  transition: opacity var(--motion-enter);
}
.field-lilac {
  width: 320px;
  height: 240px;
  right: 120px;
  top: 100px;
  background: #b8b5d6;
  opacity: 0.45;
  animation-delay: -7s;
  animation-duration: 23s;
}
.field-blue {
  width: 330px;
  height: 200px;
  right: -50px;
  bottom: -100px;
  background: #94c6e0;
  opacity: 0.7;
  animation-delay: -13s;
}
.ribbon-stage {
  position: absolute;
  right: 0;
  top: 24px;
  bottom: 24px;
  width: 40%;
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
  left: 24%;
  right: 19%;
  bottom: 20px;
  height: 20px;
  background: #9f306d;
  opacity: 0.09;
  filter: blur(16px);
  transform: rotate(-8deg);
}
.ribbon-scrim {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, #fff 0%, #fffffff5 46%, #ffffff00 73%);
}
.motion-toggle {
  position: absolute;
  right: 16px;
  top: 16px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border-control);
  border-radius: 50%;
  color: var(--text);
  background: #fffffff0;
  pointer-events: auto;
  cursor: pointer;
  transition:
    background var(--motion-fast),
    color var(--motion-fast),
    transform var(--motion-fast);
}
.motion-toggle:hover {
  background: var(--graphite);
  border-color: var(--graphite);
  color: white;
  transform: scale(1.06);
}
.motion-toggle::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
}
.motion-toggle:active {
  transform: scale(0.94);
}
.is-still .color-field {
  animation-play-state: paused;
  will-change: auto;
}
.is-engaged .field-rose {
  opacity: 0.7;
}
@keyframes field-drift {
  from {
    transform: translate3d(-16px, -8px, 0) scale(0.94);
  }
  to {
    transform: translate3d(24px, 16px, 0) scale(1.08);
  }
}
@media (max-width: 1100px) and (min-width: 761px) {
  .ribbon-stage {
    width: 36%;
    top: 44px;
    bottom: 44px;
    right: -4px;
  }
}
@media (max-width: 760px) {
  .liquid-ribbon {
    position: relative;
    inset: auto;
    width: 100%;
    height: 132px;
    margin-block: 4px;
  }
  .ribbon-stage {
    width: 240px;
    height: 150px;
    top: -10px;
    right: calc(50% - 120px);
    bottom: auto;
  }
  .ribbon-scrim {
    display: none;
  }
  .field-rose {
    width: 180px;
    height: 100px;
    right: 15%;
    top: 0;
    opacity: 0.25;
  }
  .field-lilac {
    width: 180px;
    height: 100px;
    right: 25%;
    top: 30px;
    opacity: 0.25;
  }
  .field-blue {
    width: 180px;
    height: 100px;
    right: 0;
    bottom: -40px;
    opacity: 0.3;
  }
  .ribbon-shadow {
    bottom: 12px;
  }
  .motion-toggle {
    width: 36px;
    height: 36px;
    right: 4px;
    top: 48px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .color-field {
    animation: none;
    will-change: auto;
  }
}
</style>
