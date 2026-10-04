import { useRef, useState } from "react";
import { LayoutChangeEvent, PanResponder, Text, View } from "react-native";
import { clampCardCount, resolveCardCountBounds } from "../lib/card-count";

const THUMB_SIZE = 28;
const TRACK_HEIGHT = 3;

type CardCountPickerProps = {
  value: number;
  onChange: (next: number) => void;
  /** How many cards actually exist. null when the screen does not know yet. */
  availableCardCount: number | null;
  disabled?: boolean;
  /** Caption under the control, e.g. "184 cards available in this deck". */
  availabilityLabel?: string | null;
};

export function CardCountPicker({
  value,
  onChange,
  availableCardCount,
  disabled = false,
  availabilityLabel,
}: CardCountPickerProps) {
  const [trackWidth, setTrackWidth] = useState(0);
  const trackRef = useRef<View>(null);
  const trackPageXRef = useRef(0);
  const trackWidthRef = useRef(0);

  const { min, max } = resolveCardCountBounds(availableCardCount);
  const displayValue = clampCardCount(value, availableCardCount);
  const adjustable = !disabled && max > min;

  // PanResponder is created once, so the handlers must read the current bounds
  // and callback from a ref instead of closing over the first render's values —
  // the max changes whenever the selected difficulty or deck does.
  const latestRef = useRef({ availableCardCount, onChange, disabled, displayValue });
  latestRef.current = { availableCardCount, onChange, disabled, displayValue };

  function commit(next: number) {
    const current = latestRef.current;
    if (current.disabled) return;
    const clamped = clampCardCount(next, current.availableCardCount);
    if (clamped !== current.displayValue) current.onChange(clamped);
  }

  function valueFromPosition(position: number, usableWidth: number) {
    const bounds = resolveCardCountBounds(latestRef.current.availableCardCount);
    if (usableWidth <= 0 || bounds.max <= bounds.min) return bounds.min;
    const clampedPosition = Math.min(usableWidth, Math.max(0, position));
    const ratio = clampedPosition / usableWidth;
    return bounds.min + Math.round(ratio * (bounds.max - bounds.min));
  }

  function commitFromPageX(
    pageX: number,
    measuredPageX = trackPageXRef.current,
    measuredWidth = trackWidthRef.current,
  ) {
    const usableWidth = Math.max(measuredWidth - THUMB_SIZE, 0);
    commit(valueFromPosition(pageX - measuredPageX - THUMB_SIZE / 2, usableWidth));
  }

  function measureTrack(pageX?: number) {
    trackRef.current?.measureInWindow((x, _y, width) => {
      trackPageXRef.current = x;
      trackWidthRef.current = width;
      if (width > 0) setTrackWidth(width);
      if (typeof pageX === "number") commitFromPageX(pageX, x, width);
    });
  }

  function handleTrackLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width;
    trackWidthRef.current = width;
    setTrackWidth(width);
    requestAnimationFrame(() => measureTrack());
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !latestRef.current.disabled,
      onMoveShouldSetPanResponder: () => !latestRef.current.disabled,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (event, gestureState) => {
        const pageX = event.nativeEvent.pageX || gestureState.x0;
        measureTrack(pageX);
        commitFromPageX(pageX);
      },
      onPanResponderMove: (_, gestureState) => {
        commitFromPageX(gestureState.moveX);
      },
    }),
  ).current;

  const usableWidth = Math.max(trackWidth - THUMB_SIZE, 0);
  const ratio = max > min ? (displayValue - min) / (max - min) : 0;
  const thumbPosition = usableWidth > 0 ? ratio * usableWidth : 0;

  return (
    <View>
      <View className="flex-row items-center justify-between">
        <Text className="text-base font-medium text-foreground">Cards</Text>
        {/* Before the deck or category has loaded the max is 0 and there is
            nothing to clamp against, so keep showing the pending choice. */}
        <Text className="text-xl font-semibold text-foreground">
          {max > 0 ? displayValue : value}
        </Text>
      </View>

      {adjustable ? (
        <>
          <View
            ref={trackRef}
            onLayout={handleTrackLayout}
            className="justify-center mt-2"
            style={{ height: THUMB_SIZE, opacity: disabled ? 0.4 : 1 }}
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Cards in this session"
            accessibilityValue={{ min, max, now: displayValue }}
            accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
            onAccessibilityAction={(event) => {
              if (event.nativeEvent.actionName === "increment") commit(displayValue + 1);
              if (event.nativeEvent.actionName === "decrement") commit(displayValue - 1);
            }}
            {...panResponder.panHandlers}
          >
            <View
              className="rounded-full bg-border"
              style={{ height: TRACK_HEIGHT, marginHorizontal: THUMB_SIZE / 2 }}
            />
            <View
              className="absolute rounded-full bg-primary"
              style={{
                height: TRACK_HEIGHT,
                left: THUMB_SIZE / 2,
                width: thumbPosition,
              }}
            />
            <View
              className="absolute rounded-full bg-primary"
              style={{
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                left: thumbPosition,
              }}
            />
          </View>

          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted">{min}</Text>
            <Text className="text-xs text-muted">{max}</Text>
          </View>
        </>
      ) : null}

      {availabilityLabel ? (
        <Text className="text-center text-xs text-muted mt-1">{availabilityLabel}</Text>
      ) : null}
    </View>
  );
}
