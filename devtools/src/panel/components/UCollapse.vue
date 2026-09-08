<script setup lang="ts">
import { useTemplateRef, type Component } from 'vue'

const { scrollOnOpen } = defineProps<{
  title?: string
  icon?: Component
  noPadding?: boolean
  scrollOnOpen?: boolean
}>()

const open = defineModel<boolean>('open', {
  default: true,
})

const collapse = useTemplateRef('collapse')
let pendingScroll: { container: HTMLElement; scrollTop: number } | undefined

function prepareScroll(event: Event) {
  // Only opted-in sections prepare a scroll when the user opens them.
  if (
    !scrollOnOpen ||
    !(event.currentTarget instanceof HTMLInputElement) ||
    !event.currentTarget.checked
  ) {
    // Closing before the animation ends cancels any pending scroll.
    pendingScroll = undefined
    return
  }

  // The split pane owns the visible scroll area for the section.
  const container = collapse.value?.closest<HTMLElement>('.splitpanes__pane')
  if (container) {
    // Remember its position so later user scrolling can take priority.
    pendingScroll = {
      container,
      scrollTop: container.scrollTop,
    }
  }
}

function scrollAfterOpening(event: TransitionEvent) {
  // Wait for this section's animation; pendingScroll only exists after a user opens it.
  if (event.propertyName !== 'grid-template-rows' || !pendingScroll) return

  const scroll = pendingScroll
  pendingScroll = undefined

  const element = collapse.value
  // A changed scroll position means the user took control while the section was opening.
  if (!element || !open.value || Math.abs(scroll.container.scrollTop - scroll.scrollTop) > 1) return

  const sectionRect = element.getBoundingClientRect()
  const containerRect = scroll.container.getBoundingClientRect()

  // Keep the current view when the whole section already fits in the pane.
  if (sectionRect.bottom <= containerRect.bottom + 1) return

  scroll.container.scrollTo({
    top: scroll.container.scrollTop + sectionRect.top - containerRect.top,
    behavior: 'smooth',
  })
}
</script>

<template>
  <div ref="collapse" class="collapse collapse-arrow" @transitionend.self="scrollAfterOpening">
    <div class="collapse-header">
      <input v-model="open" type="checkbox" @change="prepareScroll" />
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
    </div>
    <div :class="!noPadding && 'px-2'" class="collapse-content text-sm overflow-clip">
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
  overflow: clip;
  width: 100%;
  grid-template-rows: max-content 0fr;
  transition: grid-template-rows 0.2s;
  isolation: isolate;

  > .collapse-header > input:is([type='checkbox'], [type='radio']) {
    position: absolute;
    inset: 0;
    appearance: none;
    opacity: 0;
    cursor: inherit;
  }

  &:is([open], :focus),
  &:has(> .collapse-header > input:is([type='checkbox'], [type='radio']):checked) {
    grid-template-rows: max-content 1fr;
  }

  &:is([open], :focus) > .collapse-content,
  &:not(.collapse-close)
    > :where(
      .collapse-header:has(> input:is([type='checkbox'], [type='radio']):checked)
        ~ .collapse-content
    ) {
    visibility: visible;
    min-height: fit-content;
  }
  &:focus-visible,
  &:has(> .collapse-header > input:is([type='checkbox'], [type='radio']):focus-visible) {
    outline-color: var(--ui-text);
    outline-style: solid;
    outline-width: 2px;
    outline-offset: 2px;
  }

  &:not(.collapse-close) {
    > .collapse-header {
      cursor: pointer;
    }
  }

  &:focus:not(.collapse-close, .collapse[open]) > .collapse-header {
    cursor: unset;
  }

  &:is([open]) {
    &.collapse-arrow {
      > .collapse-header > .collapse-title:after {
        transform: translateY(-50%) rotate(225deg);
      }
    }
  }

  &.collapse-arrow:focus {
    > .collapse-header > .collapse-title:after {
      transform: translateY(-50%) rotate(225deg);
    }
  }

  &.collapse-arrow {
    > .collapse-header
      > input:is([type='checkbox'], [type='radio']):checked
      ~ .collapse-title:after {
      transform: translateY(-50%) rotate(225deg);
    }
  }

  > .collapse-header > input:is([type='checkbox'], [type='radio']) {
    z-index: 1;
    width: 100%;
  }

  &:has(> .collapse-header > input:is([type='checkbox'], [type='radio']):checked)
    > .collapse-header {
    position: sticky;
    top: 0;
    z-index: 1;
  }
}

.collapse-header,
.collapse-content {
  grid-column-start: 1;
  grid-row-start: 1;
}

.collapse-content {
  position: relative;
  z-index: 0;
  visibility: hidden;
  grid-column-start: 1;
  grid-row-start: 2;
  min-height: 0;
  cursor: unset;
  transition: visibility 0.2s;
}

.collapse-arrow {
  > .collapse-header > .collapse-title:after {
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

.collapse-header {
  position: relative;
}

.collapse-title {
  position: relative;
  width: 100%;
  transition: background-color 0.2s ease-out;
}
</style>
