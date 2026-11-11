package com.deadline.platform.bloqueio

import com.deadline.core.domain.port.BlockDecision
import com.deadline.core.domain.port.BlockEnforcer
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class NoOpBlockEnforcer @Inject constructor() : BlockEnforcer {
    override fun show(d: BlockDecision) = Unit
    override fun dismiss() = Unit
}
