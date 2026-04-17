import {
  Home, Calendar, CheckSquare, Image, PiggyBank, Lightbulb, Star,
  UtensilsCrossed, Plane, Mail, Heart, Music, BookOpen, Camera,
  ShoppingCart, Coffee, Smile, Sun, Moon, Cloud, Flower2, TreePine,
  Waves, Mountain, Gift, Trophy, Zap, Flame, Globe, Map, Compass,
  Clock, Bookmark, Tag, Bell, Settings, Users, User, Baby, Dog,
  Car, Bike, Train, Ship, TentTree, Tent, Umbrella, Palette,
  Pencil, Scissors, Gem, Crown, Diamond, Gamepad2,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  Home, Calendar, CheckSquare, Image, PiggyBank, Lightbulb, Star,
  UtensilsCrossed, Plane, Mail, Heart, Music, BookOpen, Camera,
  ShoppingCart, Coffee, Smile, Sun, Moon, Cloud, Flower2, TreePine,
  Waves, Mountain, Gift, Trophy, Zap, Flame, Globe, Map, Compass,
  Clock, Bookmark, Tag, Bell, Settings, Users, User, Baby, Dog,
  Car, Bike, Train, Ship, TentTree, Tent, Umbrella, Palette,
  Pencil, Scissors, Gem, Crown, Diamond, Gamepad2,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

export function getIcon(name: string): LucideIcon {
  return ICON_MAP[name] || Star;
}
