import * as THREE from 'three';
import { attachAnimatedTribute } from './animatedTribute.js';

export function createTributeFigure(index, own = (value) => value) {
  const group = new THREE.Group();
  group.name = `tribute-${index + 1}`;
  // Kept for the scene's elimination opacity API; people are hidden on elimination.
  const coat = own(new THREE.MeshStandardMaterial());
  const animated = attachAnimatedTribute(group, index, own);
  return { group, coat, animate: animated.update };
}
