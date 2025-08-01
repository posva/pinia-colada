<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
  title?: string
  icon?: Component
  noPadding?: boolean
}>()

const open = defineModel<boolean>('open', {
  default: true,
})

function scrollIfNeeded(event: TransitionEvent) {
  if (event.target instanceof HTMLElement) {
    const scrollOptions: ScrollIntoViewOptions = {
      block: 'nearest',
      inline: 'nearest',
      behavior: 'smooth',
    }
    event.target.scrollIntoView(scrollOptions)
  }
}
</script>

<template>
  <div class="collapse collapse-arrow">
    <input v-model="open" type="checkbox">
    <div class="collapse-title px-2 py-0.5 bg-neutral-200 dark:bg-neutral-800 theme-neutral">
      <slot name="title" :open :title>
        <h3 class="font-semibold text-sm flex gap-x-1 items-center">
          <slot name="icon">
            <component :is="icon" v-if="icon" class="size-4" />
          </slot>
          {{ title ?? 'Group' }}
        </h3>
      </slot>
    </div>
    <div
      :class="!noPadding && 'px-2 py-0.5'"
      class="collapse-content text-sm overflow-hidden"
      @transitionend="scrollIfNeeded"
    >
      <slot :open />
    </div>
  </div>
</template>

<style scoped>
.collapse:not(td, tr, colgroup) {
  visibility: visible;
}

.collapse {
  position: relative;
  display: grid;
  overflow: hidden;
  width: 100%;
  grid-template-rows: max-content 0fr;
  transition: grid-template-rows 0.2s;
  isolation: isolate;

  > input:is([type='checkbox'], [type='radio']) {
    grid-column-start: 1;
    grid-row-start: 1;
    appearance: none;
    opacity: 0;
  }

  &:is([open], :focus),
  &:has(> input:is([type='checkbox'], [type='radio']):checked) {
    grid-template-rows: max-content 1fr;
  }

  &:is([open], :focus) > .collapse-content,
  &:not(.collapse-close)
    > :where(input:is([type='checkbox'], [type='radio']):checked ~ .collapse-content) {
    visibility: visible;
    min-height: fit-content;
  }
  &:focus-visible,
  &:has(> input:is([type='checkbox'], [type='radio']):focus-visible) {
    outline-color: var(--ui-text);
    outline-style: solid;
    outline-width: 2px;
    outline-offset: 2px;
  }

  &:not(.collapse-close) {
    > input[type='checkbox'],
    > input[type='radio']:not(:checked),
    > .collapse-title {
      cursor: pointer;
    }
  }

  &:focus:not(.collapse-close, .collapse[open]) > .collapse-title {
    cursor: unset;
  }

  &:is([open]) {
    &.collapse-arrow {
      > .collapse-title:after {
        transform: translateY(-50%) rotate(225deg);
      }
    }
  }

  &.collapse-arrow:focus {
    > .collapse-title:after {
      transform: translateY(-50%) rotate(225deg);
    }
  }

  &.collapse-arrow {
    > input:is([type='checkbox'], [type='radio']):checked ~ .collapse-title:after {
      transform: translateY(-50%) rotate(225deg);
    }
  }

  > input:is([type='checkbox'], [type='radio']) {
    z-index: 1;
    width: 100%;
  }
}

.collapse-title,
.collapse-content {
  grid-column-start: 1;
  grid-row-start: 1;
}

.collapse-content {
  visibility: hidden;
  grid-column-start: 1;
  grid-row-start: 2;
  min-height: 0;
  cursor: unset;
  transition: visibility 0.2s;
}

.collapse-arrow {
  > .collapse-title:after {
    position: absolute;
    display: block;
    height: 0.5rem;
    width: 0.5rem;
    transform: translateY(-100%) rotate(45deg);
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 0.2s;
    top: 50%;
    right: 0.8em;
    inset-inline-end: 0.75rem;
    content: '';
    transform-origin: 75% 75%;
    box-shadow: 2px 2px;
    pointer-events: none;
  }
}

.collapse-title {
  position: relative;
  width: 100%;
  transition: background-color 0.2s ease-out;
}
</style>
