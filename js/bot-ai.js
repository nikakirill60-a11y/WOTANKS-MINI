// Arcade bot controller. Decisions use team sightings; losing sight leaves a point in
// memory, not a live pointer to the hidden vehicle's position. Driving and reloads use
// exactly the same collision, terrain and Tank.fire code as the player's vehicle.
const BotAI = (() => {
  let plansLeft = 0;
  const turn = (to, from) => Math.atan2(Math.sin(to - from), Math.cos(to - from));
  const limit = (v, n) => Math.max(-n, Math.min(n, v));
  function attach(u, slot, nav) {
    if (!nav.recon) nav.recon = new BattleRecon(nav);
    const hub = nav.arena.hubs[slot.lane];
    // Supporters open in the same five corridors, but not at a scout's exact
    // destination or at each other's parking spot. Then they also survey sectors.
    const offset = ((slot.index % 3) - 1) * 76,
      side = slot.side ? 1 : -1;
    const opening = nav.point(
      nav.nearest(hub.x + offset * side, hub.y + side * ((slot.index % 4) - 1.5) * 54)
    );
    u.bot = {
      order: slot.index * 2 + slot.side,
      side: slot.side,
      scout: !!slot.scout,
      hub,
      opening: slot.scout ? null : opening,
      openingDistance: Infinity,
      openingUntil: 0,
      firstSurvey: !!slot.scout,
      sector: -1,
      skipSector: -1,
      radio: null,
      mode: 'advance',
      ideal: 155 + (DB[u.id].cls === 'ht' ? 70 : 25) + (slot.index % 3) * 12,
      target: null,
      memory: null,
      open: false,
      aimTicks: 0,
      nextLook: 1 + ((slot.index * 3) % 16),
      path: [],
      at: 0,
      goal: null,
      planAfter: 0,
      revision: -1,
      steerAt: 0,
      heading: u.angle,
      blocked: 0,
      backup: 0,
      crowded: false,
      yieldUntil: 0,
      sideStep: null,
      shift: false,
      shell: 0
    };
  }
  function beginTick(nav, now) {
    plansLeft = 2;
    if (!nav) return;
    if (nav.revision !== nav.arena.revision) {
      nav.rebuild();
      nav.recon?.rebuild();
    }
    if (now === 1 || now % 12 === 0) nav.recon?.sample(GameState.units, now);
  }
  function observe(u, b, now) {
    const previous = b.target;
    let best = null,
      score = Infinity,
      line = false;
    for (const t of GameState.units) {
      if (t.dead || !t.spotted || (t.team === 'enemy') === (u.team === 'enemy')) continue;
      const d = Math.hypot(t.x - u.x, t.y - u.y);
      if (d > 1250) continue;
      const open = d <= 580 && clearBattleSight(u, t);
      const s = d + (open ? 0 : 400) - (t === previous ? 90 : 0) - (t.hp <= u.dmg ? 48 : 0);
      if (s < score) {
        best = t;
        score = s;
        line = open;
      }
    }
    if (previous !== best) {
      b.aimTicks = 0;
      b.shell = 0;
      b.shift = false;
      b.yieldUntil = 0;
    }
    b.target = best;
    b.open = line;
    b.nextLook = now + 16;
    b.radio = !best && !b.scout ? GameState.navigation.recon.report(u, now) : null;
    if (best) b.memory = { x: best.x, y: best.y, until: now + BattleRecon.reportLife };
  }
  function friendInWay(u, t) {
    const dx = t.x - u.x,
      dy = t.y - u.y,
      d2 = dx * dx + dy * dy;
    return GameState.units.some((a) => {
      if (a === u || a.dead || (a.team === 'enemy') !== (u.team === 'enemy') || !d2) return false;
      const k = ((a.x - u.x) * dx + (a.y - u.y) * dy) / d2;
      return k > 0 && k < 1 && (a.x - u.x - k * dx) ** 2 + (a.y - u.y - k * dy) ** 2 < (13 * a.s) ** 2;
    });
  }
  function sidestep(u, b, dx, dy, nav) {
    const preferred = (b.order >> 1) % 2 ? 1 : -1;
    for (const sign of [preferred, -preferred]) {
      const x = u.x - dy * sign * 94,
        y = u.y + dx * sign * 94;
      if (nav.clear(u.x, u.y, x, y)) return { x, y };
    }
    return nav.point(nav.nearest(u.x - dx * 80, u.y - dy * 80));
  }
  // Only react to feedback from an actual blocked hit on the current, spotted target.
  function onBlockedHit(u, t) {
    const b = u.bot;
    if (b?.target !== t || !t.spotted) return;
    b.shell = u.usesMagazine ? 0 : 2;
    b.shift = true;
  }
  function steer(u, b, p, nav, now) {
    const dist = Math.hypot(p.x - u.x, p.y - u.y),
      wanted = Math.atan2(p.y - u.y, p.x - u.x);
    if (now >= b.steerAt) {
      b.steerAt = now + 7;
      const look = Math.min(58, dist),
        others = GameState.units.filter(
          (a) => a !== u && !a.dead && Math.abs(a.x - u.x) < 108 && Math.abs(a.y - u.y) < 108
        );
      let best = Infinity;
      for (const offset of [0, 0.42, -0.42, 0.82, -0.82, 1.25, -1.25, 1.7, -1.7, 2.35, -2.35, Math.PI]) {
        const a = wanted + offset,
          dx = Math.cos(a),
          dy = Math.sin(a);
        if (!nav.clear(u.x, u.y, u.x + dx * look, u.y + dy * look)) continue;
        let cost = Math.abs(offset) + 0.16 * Math.abs(turn(a, u.angle));
        for (const o of others) {
          const ox = o.x - u.x,
            oy = o.y - u.y,
            along = ox * dx + oy * dy;
          if (along <= 0) continue;
          const step = Math.min(look, along),
            d = Math.hypot(ox - step * dx, oy - step * dy);
          cost += Math.max(0, (u.s + o.s) * 24 - d) * 0.16;
        }
        if (cost < best) {
          best = cost;
          b.heading = a;
        }
      }
      if (!Number.isFinite(best)) b.heading = wanted;
    }
    const delta = turn(b.heading, u.angle);
    b.steer = limit(delta / 0.12, 1);
    const stoppingDistance = (u.driveSpeed ** 2 / (2 * 5.5)) * BATTLE_UNITS_PER_METRE;
    b.brake = Math.abs(delta) > 1.02 || stoppingDistance > dist;
    // Approach a corner at a speed that leaves room to brake. Do not bypass
    // inertia by writing positions, including during traffic recovery.
    if (!b.brake) {
      b.throttle = Math.min(0.95, 0.32 + dist / 95) * (1 - 0.37 * Math.abs(delta));
      // Don't try to creep up a grade on too little throttle to move at all.
      if (u.driveSpeed < 2 && u.groundPitch > 0) {
        const grade = 9.81 * 0.85 * Math.sin(u.groundPitch),
          drag = 0.045 * 9.81 * CONFIG.TERRAIN[u.currentTerrain].resistance;
        b.throttle = Math.max(b.throttle, Math.min(1, (grade + drag + 0.3) / 2.6));
      }
    }
  }
  function follow(u, b, goal, nav, now) {
    if (b.backup > 0) {
      b.backup--;
      b.throttle = -1;
      b.brake = false;
      return;
    }
    const changed = !b.goal || Math.hypot(goal.x - b.goal.x, goal.y - b.goal.y) > 80;
    const stale = b.revision !== nav.revision;
    if ((changed || stale || b.crowded || !b.path.length) && now >= b.planAfter && plansLeft > 0) {
      plansLeft--;
      const traffic = b.crowded
        ? GameState.units.filter((a) => a !== u && !a.dead && Math.hypot(a.x - u.x, a.y - u.y) < 220)
        : [];
      b.path = nav.route(u, goal, traffic);
      b.at = 0;
      b.goal = { x: goal.x, y: goal.y };
      b.crowded = false;
      b.revision = nav.revision;
      b.planAfter = now + 36 + (b.order % 9);
      b.steerAt = 0;
    }
    while (b.at < b.path.length && Math.hypot(b.path[b.at].x - u.x, b.path[b.at].y - u.y) < 17) {
      b.at++;
      b.steerAt = 0;
    }
    if (b.at >= b.path.length) {
      if (b.path.length && !changed) {
        if (b.mode === 'advance') b.opening = null;
        else if (b.mode === 'search') b.memory = null;
      }
      b.path = [];
      return;
    }
    steer(u, b, b.path[b.at], nav, now);
  }
  function step(u, now) {
    u.isMoving = false;
    if (u.practiceTarget) return;
    const b = u.bot,
      nav = GameState.navigation;
    b.throttle = b.steer = 0;
    b.brake = true;
    if (b.target?.dead) {
      b.target = null;
      b.memory = null;
      b.aimTicks = 0;
      b.nextLook = now;
    } else if (b.target && !b.target.spotted) {
      b.target = null;
      b.aimTicks = 0;
      b.nextLook = now;
    }
    if (now >= b.nextLook) observe(u, b, now);
    const t = b.target;
    let dest = null,
      mode = 'advance';
    if (t) {
      b.opening = null;
      b.firstSurvey = false;
      const dx = t.x - u.x,
        dy = t.y - u.y,
        d = Math.max(1, Math.hypot(dx, dy));
      const bearing = u.lookAtPoint(t.x, t.y, t.aimHeight);
      u.slewSight(0.042);
      const outOfArc =
        u.minYaw === u.maxYaw ? Math.abs(turn(bearing, u.angle)) > 0.007 : !u.canTraverseTo(bearing);
      const ready = b.open && !outOfArc && Math.abs(turn(u.lookYaw, u.tAngle)) < 0.035;
      b.aimTicks = ready ? b.aimTicks + 1 : 0;
      const closeAlly = b.open && friendInWay(u, t);
      const stand = b.ideal + (u.hp < u.maxHp * 0.4 ? 40 : 0);
      if (b.open && now >= b.yieldUntil && (b.shift || (closeAlly && d < stand + 80))) {
        b.sideStep = sidestep(u, b, dx / d, dy / d, nav);
        b.yieldUntil = now + 90;
      }
      b.shift = false;
      if (b.open && d < stand * 0.62) {
        mode = 'space';
        dest = { x: u.x - (dx / d) * 85, y: u.y - (dy / d) * 85 };
      } else if (b.open && now < b.yieldUntil) {
        mode = 'space';
        dest = b.sideStep;
      } else if (!b.open || d > stand + 28) {
        mode = 'approach';
        dest = t;
      } else {
        mode = 'engage';
        if (outOfArc) b.steer = limit(turn(bearing, u.angle) / 0.12, 1);
      }
      // Recheck the shot now; a sighting/clear segment from the last decision isn't a firing permit.
      if (
        b.aimTicks >= 18 + (b.order % 9) &&
        !closeAlly &&
        !u.isReloading &&
        BattleClock.now() >= u.nextShot &&
        clearBattleSight(u, t)
      ) {
        // Same model muzzle as the player's reticle and projectile. Friends block a bot's shot.
        const shot = u.sightHit(d + 40, true);
        if (shot.hit === t) u.fire(b.shell);
        else if (b.mode === 'engage') b.shift = true;
      }
    } else {
      if (b.opening) {
        const d = Math.hypot(u.x - b.opening.x, u.y - b.opening.y);
        if (d < b.openingDistance - 18) {
          b.openingDistance = d;
          b.openingUntil = now + 540;
        }
        if (d < 17 || now >= b.openingUntil) b.opening = null;
      }
      const seen = b.memory;
      if (seen && now < seen.until && Math.hypot(u.x - seen.x, u.y - seen.y) > 26) {
        mode = 'search';
        dest = seen;
      } else {
        b.memory = null;
        if (b.radio && b.radio.until > now && Math.hypot(u.x - b.radio.x, u.y - b.radio.y) > 50) {
          mode = 'investigate';
          dest = b.radio;
          b.opening = null;
        } else if (b.opening) {
          dest = b.opening;
        } else {
          mode = 'survey';
          dest = nav.recon.destination(u, now);
        }
      }
      // Sweep the in-game turret on survey runs. Detection itself still uses
      // the normal view range and occlusion tests, not the sector overlay.
      const look =
        mode === 'search' || mode === 'investigate'
          ? Math.atan2(dest.y - u.y, dest.x - u.x)
          : mode === 'survey'
            ? u.angle + 0.7 * Math.sin(now * 0.013 + b.order)
            : u.angle;
      u.setLook(look, 0);
      u.slewSight(0.035);
    }
    if (mode !== 'survey' && b.sector >= 0) nav.recon.release(u);
    if (b.mode !== mode) {
      b.goal = null;
      b.path = [];
      b.at = 0;
      b.planAfter = now;
      b.steerAt = 0;
      b.mode = mode;
    }
    if (dest) follow(u, b, dest, nav, now);
    TrackDrive.step(u, b.throttle, b.steer, b.brake, nav);
    if (b.throttle > 0 && u.driveBlocked) {
      b.steerAt = 0;
      if (++b.blocked >= 35) {
        b.crowded = true;
        b.backup = 96;
        b.blocked = 0;
        b.planAfter = now + b.backup;
      }
    } else if (u.isMoving) b.blocked = 0;
  }
  return { attach, beginTick, step, onBlockedHit };
})();
