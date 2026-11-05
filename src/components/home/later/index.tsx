"use client";
import S5Minds from "./S5Minds";
import S6Keys from "./S6Keys";
import S7Chain from "./S7Chain";
import S8Vision from "./S8Vision";
import S9Stands from "./S9Stands";

/** Home S5–S9. Each section root carries id="s5"… and data-home-section="5"… for the camera timeline. */
export default function HomeLater() {
  return (
    <>
      <S5Minds />
      <S6Keys />
      <S7Chain />
      <S8Vision />
      <S9Stands />
    </>
  );
}
